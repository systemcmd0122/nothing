import { Client, GatewayIntentBits, REST, Routes, ActivityType } from "discord.js";
import dotenv from "dotenv";
import http from "http";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import "./src/utils/logCapture.js"; // ログキャプチャを有効化
import { getLogs } from "./src/utils/logCapture.js";
import registerCommand from "./src/commands/register.js";
import rankCommand from "./src/commands/rank.js";
import recordCommand from "./src/commands/record.js";
import myaccountCommand from "./src/commands/myaccount.js";
import setupboardCommand from "./src/commands/setupboard.js";
import adminregisterCommand from "./src/commands/adminregister.js";
import deleteRankRolesCommand from "./src/commands/deleteRankRoles.js";
import pickCommand from "./src/commands/pick.js";
import setupAgentBoardCommand from "./src/commands/setupAgentBoard.js";
import { handleModalSubmit } from "./src/commands/modalHandler.js";
import { handleBoardButton } from "./src/commands/boardButtonHandler.js";
import { handleAgentBoardButton } from "./src/services/agentBoardHandler.js";
import { syncAllUserRanks, initializeRankRoles } from "./src/services/rankSync.js";
import { getRandomAgent, getRandomAgentByRole, getAllAgents } from "./src/services/agents.js";
import "./src/config/firebase.js"; // Initialize Firebase

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Static files
app.use(express.static(path.join(__dirname, "public")));

// Dashboard ページ
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// API: コンソールログを取得
app.get("/api/logs", (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const logs = getLogs(limit);
  res.json({ logs });
});

// API: ランダムエージェントを取得
app.get("/api/random-agent", (req, res) => {
  try {
    const role = req.query.role || "random";
    
    let selectedAgent;
    if (role === "random") {
      selectedAgent = getRandomAgent();
    } else {
      selectedAgent = getRandomAgentByRole(role);
    }

    if (!selectedAgent) {
      return res.status(404).json({ error: "エージェントが見つかりません" });
    }

    res.json({
      agent: selectedAgent,
      imageUrl: `/agents/${selectedAgent.image}`,
    });
  } catch (error) {
    console.error("Error getting random agent:", error);
    res.status(500).json({ error: "エージェント取得エラー" });
  }
});

// API: すべてのエージェントを取得
app.get("/api/agents", (req, res) => {
  try {
    const agents = getAllAgents();
    res.json({ agents });
  } catch (error) {
    console.error("Error getting agents:", error);
    res.status(500).json({ error: "エージェント取得エラー" });
  }
});

// Agentイメージサーバー
app.use("/agents", express.static(path.join(__dirname, "agents")));

// Keep-Alive機能（Koyeb無料枠でのスリープモード防止）
function startKeepAlive() {
  const port = process.env.PORT || 3000;
  
  return new Promise((resolve) => {
    app.listen(port, "0.0.0.0", () => {
      console.log(`[OK] Express server running on port ${port}`);
      resolve();
    });
  });
}

// 定期的に自身にHTTPリクエストを送信してスリープモードを防止
function startKeepAlivePing() {
  setInterval(async () => {
    try {
      const port = process.env.PORT || 3000;
      const hostname = process.env.KOYEB_DOMAIN || "localhost";
      const url = `http://${hostname}:${port}`;
      
      const request = http.get(url, (response) => {
        if (response.statusCode === 200) {
          console.log("[OK] Keep-Alive ping sent successfully");
        }
      });

      request.on("error", (err) => {
        console.warn("[WARN] Keep-Alive ping error:", err.message);
      });

      request.setTimeout(5000);
    } catch (error) {
      console.warn("[WARN] Keep-Alive error:", error.message);
    }
  }, 180000); // 3分ごとにKeep-Alive ping（Koyeb無料枠のスリープ防止）
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
});

const commands = [registerCommand, rankCommand, recordCommand, myaccountCommand, setupboardCommand, adminregisterCommand, deleteRankRolesCommand, pickCommand, setupAgentBoardCommand];

// Register slash commands
async function registerSlashCommands() {
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

  try {
    console.log(">>> Registering slash commands...");

    const commandData = commands.map((cmd) => cmd.data.toJSON());

    // Register globally
    await rest.put(Routes.applicationCommands(client.user.id), { body: commandData });

    console.log(`[OK] Successfully registered ${commandData.length} slash commands!`);
  } catch (error) {
    console.error("Error registering slash commands:", error);
  }
}

client.once("clientReady", async () => {
  console.log(`Bot logged in as ${client.user.tag}`);

  // Keep-Alive機能を開始（Koyeb無料枠でのスリープモード防止）
  await startKeepAlive();
  startKeepAlivePing();

  // Register commands once bot is ready
  await registerSlashCommands();

  // Get the main guild (assuming bot is in one guild, or use DISCORD_GUILD_ID env var)
  let targetGuild;
  if (process.env.DISCORD_GUILD_ID) {
    targetGuild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID);
  } else {
    // Use the first guild the bot is in
    targetGuild = client.guilds.cache.first();
  }

  if (!targetGuild) {
    console.warn("No guild found for rank sync. Skipping automatic sync.");
    client.user.setActivity("Error: Guild not found", {
      type: ActivityType.Custom,
    });
  } else {
    console.log(`Rank sync target guild: ${targetGuild.name}`);

    // Initialize all rank roles (バックグラウンドで実行)
    (async () => {
      try {
        await initializeRankRoles(targetGuild);
      } catch (error) {
        console.error("Rank roles initialization failed:", error);
      }

      // Initial sync after role initialization
      try {
        await syncAllUserRanks(targetGuild, client);
      } catch (error) {
        console.error("Initial rank sync failed:", error);
      }
    })();

    // Schedule rank sync every 5 minutes (300000ms)
    let nextSyncTime = Date.now() + 300000;

    // Update activity with countdown
    const updateActivity = () => {
      const now = Date.now();
      const timeUntilSync = Math.max(0, nextSyncTime - now);
      const secondsLeft = Math.ceil(timeUntilSync / 1000);

      if (secondsLeft > 0) {
        const minutes = Math.floor(secondsLeft / 60);
        const seconds = secondsLeft % 60;
        const timeString =
          minutes > 0
            ? `${minutes}m ${seconds}s後に更新`
            : `${seconds}s後に更新`;

        client.user.setActivity(timeString, {
          type: ActivityType.Custom,
        });
      }
    };

    // Update activity every second
    setInterval(updateActivity, 1000);

    // Initial activity update
    updateActivity();

    // Console log for every 30 seconds
    setInterval(() => {
      const now = Date.now();
      const timeUntilSync = Math.max(0, nextSyncTime - now);
      const secondsLeft = Math.ceil(timeUntilSync / 1000);

      if (secondsLeft > 0 && secondsLeft % 30 === 0) {
        console.log(`Next rank sync in ${secondsLeft} seconds...`);
      }
    }, 5000); // Check every 5 seconds

    // Scheduled sync
    setInterval(async () => {
      try {
        console.log("\n" + "=".repeat(60));
        console.log("Rank sync started");
        console.log("=".repeat(60));
        
        await syncAllUserRanks(targetGuild, client);
        
        nextSyncTime = Date.now() + 300000;
        console.log("=".repeat(60));
        console.log("Rank sync completed");
        console.log("=".repeat(60) + "\n");

        // Update activity after sync
        updateActivity();
      } catch (error) {
        console.error("Rank sync error", error);
      }
    }, 300000); // 5 minutes
  }
});

// Handle interactions
client.on("interactionCreate", async (interaction) => {
  try {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      const command = commands.find((cmd) => cmd.data.name === interaction.commandName);
      
      if (!command) {
        return interaction.reply({
          content: "コマンドが見つかりません。",
          flags: 64, // Ephemeral flag
        });
      }

      await command.execute(interaction);
    }
    // Handle button clicks
    else if (interaction.isButton()) {
      // Check if it's an agent board button
      if (interaction.customId.startsWith("agent_pick_")) {
        await handleAgentBoardButton(interaction);
      } else {
        await handleBoardButton(interaction);
      }
    }
    // Handle modals
    else if (interaction.isModalSubmit()) {
      await handleModalSubmit(interaction);
    }
  } catch (error) {
    console.error("Error handling interaction:", error);
    
    // Try to respond only if not already replied or deferred
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "[ERROR] An error occurred while executing the command.",
          flags: 64, // Ephemeral flag
        });
      } else if (interaction.deferred && !interaction.replied) {
        await interaction.editReply({
          content: "[ERROR] An error occurred while executing the command.",
        });
      }
    } catch (replyError) {
      console.error("Failed to send error response:", replyError);
    }
  }
});

// Error handling
client.on("error", (error) => {
  console.error("Discord client error:", error);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);
