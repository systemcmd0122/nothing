import { Client, GatewayIntentBits, REST, Routes, ActivityType } from "discord.js";
import dotenv from "dotenv";
import http from "http";
import https from "https";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import "./src/utils/logCapture.js"; // ログキャプチャを有効化
import { getLogs } from "./src/utils/logCapture.js";
import registerCommand from "./src/commands/register.js";
import unregisterCommand from "./src/commands/unregister.js";
import rankCommand from "./src/commands/rank.js";
import recordCommand from "./src/commands/record.js";
import myaccountCommand from "./src/commands/myaccount.js";
import setupboardCommand from "./src/commands/setupboard.js";
import adminregisterCommand from "./src/commands/adminregister.js";
import deleteRankRolesCommand from "./src/commands/deleteRankRoles.js";
import pickCommand from "./src/commands/pick.js";
import setupAgentBoardCommand from "./src/commands/setupAgentBoard.js";
import notifysettingsCommand from "./src/commands/notifysettings.js";
import settingsCommand from "./src/commands/settings.js";
import { handleModalSubmit } from "./src/commands/modalHandler.js";
import { handleBoardButton } from "./src/commands/boardButtonHandler.js";
import { handleAgentBoardButton } from "./src/services/agentBoardHandler.js";
import { syncAllUserRanks, initializeRankRoles } from "./src/services/rankSync.js";
import { getRandomAgent, getRandomAgentByRole, getAllAgents } from "./src/services/agents.js";
import { checkAllUserRankUpdates } from "./src/services/rankChangeTracker.js";
import { getAllRegisteredAccounts } from "./src/services/valorant.js";
import { performGlobalRankUpdate } from "./src/services/globalUpdater.js";
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
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// API: ユーザーのランク一覧を取得
app.get("/api/ranks", async (req, res) => {
  try {
    const guildId = req.query.guildId;
    let accounts = await getAllRegisteredAccounts();

    // If guildId is provided, filter accounts to only those who are members of the guild
    if (guildId) {
      const guild = client.guilds.cache.get(guildId);
      if (guild) {
        const filteredAccounts = [];
        for (const account of accounts) {
          try {
            await guild.members.fetch(account.discordUserId);
            filteredAccounts.push(account);
          } catch (err) {
            // Member not in guild
          }
        }
        accounts = filteredAccounts;
      }
    }

    const ranksArray = await Promise.all(accounts.map(async (account) => {
      const rank = account.currentRank || 'Unranked';
      const division = account.currentDivision || '';
      const rr = account.currentRR || 0;

      let displayName = account.discordUserId;
      try {
        // Use provided guildId or fall back to any guild the member is in
        const targetGuild = guildId ? client.guilds.cache.get(guildId) : client.guilds.cache.find(g => g.members.cache.has(account.discordUserId));

        if (targetGuild) {
            const member = await targetGuild.members.fetch(account.discordUserId);
            displayName = member.displayName;
        } else {
            const user = await client.users.fetch(account.discordUserId);
            displayName = user.username;
        }
      } catch (err) {
        console.warn(`Failed to fetch Discord member/user ${account.discordUserId}`);
        try {
            const user = await client.users.fetch(account.discordUserId);
            displayName = user.username;
        } catch (userErr) {
            //
        }
      }

      return {
        username: account.username,
        tag: account.tag,
        displayName: displayName,
        rank: rank,
        division: division,
        rr: rr,
        region: account.region || 'unknown',
        updatedAt: account.updatedAt || new Date().toISOString()
      };
    }));

    const ranks = ranksArray.sort((a, b) => {
      // ランクで降順ソート
      const rankOrder = ["Radiant", "Immortal", "Ascendant", "Diamond", "Platinum", "Gold", "Silver", "Bronze", "Iron", "Unranked"];
      const aIndex = rankOrder.indexOf(a.rank);
      const bIndex = rankOrder.indexOf(b.rank);
      return aIndex - bIndex;
    });

    res.json({ ranks });
  } catch (error) {
    console.error("[ERROR] Failed to fetch ranks:", error);
    res.status(500).json({ error: error.message });
  }
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
app.use("/ranks", express.static(path.join(__dirname, "rank")));

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
      const hostname = process.env.KOYEB_DOMAIN;
      const url = hostname ? `https://${hostname}` : `http://localhost:${port}`;
      const protocol = url.startsWith("https") ? https : http;

      console.log(`[情報] Keep-Alive ping を送信中: ${url}`);
      const request = protocol.get(url, (response) => {
        if (response.statusCode === 200) {
          console.log("[OK] Keep-Alive ping の送信に成功しました");
        }
      });

      request.on("error", (err) => {
        console.warn("[警告] Keep-Alive ping エラー:", err.message);
      });

      request.setTimeout(5000);
    } catch (error) {
      console.warn("[警告] Keep-Alive エラー:", error.message);
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

const commands = [registerCommand, unregisterCommand, rankCommand, recordCommand, myaccountCommand, setupboardCommand, adminregisterCommand, deleteRankRolesCommand, pickCommand, setupAgentBoardCommand, notifysettingsCommand, settingsCommand];

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

    // Initialize all rank roles for all guilds (バックグラウンドで実行)
    (async () => {
      for (const [guildId, guild] of client.guilds.cache) {
        try {
          console.log(`[INFO] Initializing roles for guild: ${guild.name} (${guildId})`);
          await initializeRankRoles(guild);
        } catch (error) {
          console.error(`[ERROR] Role initialization failed for guild ${guild.name}:`, error);
        }
      }

      // Initial global sync
      try {
        await performGlobalRankUpdate(client);
      } catch (error) {
        console.error("Initial global rank sync failed:", error);
      }
    })();

    // Schedule global rank update every 1 hour (3600000ms)
    let nextSyncTime = Date.now() + 3600000;

    // Update activity with countdown
    const updateActivity = () => {
      const now = Date.now();
      const timeUntilSync = Math.max(0, nextSyncTime - now);
      const secondsLeft = Math.ceil(timeUntilSync / 1000);

      if (secondsLeft > 0) {
        const hours = Math.floor(secondsLeft / 3600);
        const minutes = Math.floor((secondsLeft % 3600) / 60);
        const seconds = secondsLeft % 60;

        let timeString = "";
        if (hours > 0) {
          timeString = `${hours}時間 ${minutes}分後に更新`;
        } else if (minutes > 0) {
          timeString = `${minutes}分 ${seconds}秒後に更新`;
        } else {
          timeString = `${seconds}秒後に更新`;
        }

        client.user.setActivity(timeString, {
          type: ActivityType.Custom,
        });
      }
    };

    // Update activity every second
    setInterval(updateActivity, 1000);

    // Initial activity update
    updateActivity();

    // Scheduled global sync
    setInterval(async () => {
      try {
        await performGlobalRankUpdate(client);
        nextSyncTime = Date.now() + 3600000;
        updateActivity();
      } catch (error) {
        console.error("Global rank sync error", error);
      }
    }, 3600000); // 1 hour

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
