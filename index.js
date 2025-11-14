const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// ロガーのインポート
const Logger = require('./utils/logger');

// 環境変数から設定を取得
const TOKEN = process.env.DISCORD_TOKEN;
const UPDATE_INTERVAL = parseInt(process.env.UPDATE_INTERVAL) || 60000;

// トークン確認
if (!TOKEN) {
    Logger.error('DISCORD_TOKEN が .env に設定されていません', 'CONFIG');
    process.exit(1);
}

// ユーティリティのインポート
const { createAllRankRoles } = require('./utils/roleManager');
const { autoUpdateRanks } = require('./utils/rankUpdater');
const { handleRegisterButton, handleRegisterModal } = require('./utils/buttonHandler');
const { handleViewMyRankButton, handleViewMyHistoryButton } = require('./utils/statsButtonHandler');
const { setUpdatingStatus, setPlayingStatus } = require('./utils/statusManager');
const { startWebServer } = require('./utils/webServer');

// クライアントの作成
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// コマンドの動的読み込み
client.commands = new Map();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

Logger.divider('コマンド読み込み');
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.data.name, command);
    Logger.success(`コマンド読み込み: ${command.data.name}`, 'COMMAND');
}
Logger.info(`合計 ${client.commands.size} 個のコマンドが読み込まれました`, 'COMMAND');


// Bot起動時
client.once('ready', async () => {
    Logger.divider('🤖 Botログイン');
    Logger.success(`ログイン成功: ${client.user.tag}`, 'BOT');
    Logger.status('ON', `アクティブサーバー数: ${client.guilds.cache.size}`);
    
    // 各サーバーでランクロールを作成
    Logger.info('ランクロール作成を開始中...', 'ROLES');
    for (const guild of client.guilds.cache.values()) {
        await createAllRankRoles(guild);
    }
    
    // スラッシュコマンドの登録
    const commands = Array.from(client.commands.values()).map(cmd => cmd.data);
    
    try {
        Logger.info('スラッシュコマンドを登録中...', 'COMMANDS');
        await client.application.commands.set(commands);
        Logger.success('スラッシュコマンド登録完了！', 'COMMANDS');
    } catch (err) {
        Logger.error('コマンド登録エラー', 'COMMANDS', err);
    }
    
    // ランク自動更新スケジューラーを開始
    Logger.success(`ランク自動更新スケジューラーを開始（${UPDATE_INTERVAL}ms）`, 'SCHEDULER');
    
    // 初期ステータスを設定
    setPlayingStatus(client);
    
    // Expressウェブサーバーの起動
    startWebServer();
    
    setInterval(() => autoUpdateRanks(client, setUpdatingStatus, setPlayingStatus), UPDATE_INTERVAL);
    
    // 起動時に一度実行
    setTimeout(() => autoUpdateRanks(client, setUpdatingStatus, setPlayingStatus), 5000);
    
    Logger.divider();
});

// インタラクション処理
client.on('interactionCreate', async interaction => {
    // スラッシュコマンド処理
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        
        if (!command) {
            Logger.warn(`コマンドが見つかりません: ${interaction.commandName}`, 'COMMAND');
            return;
        }
        
        try {
            Logger.debug(`コマンド実行: /${interaction.commandName} by ${interaction.user.tag}`, 'COMMAND');
            await command.execute(interaction);
            Logger.success(`コマンド実行完了: /${interaction.commandName}`, 'COMMAND');
        } catch (err) {
            Logger.error(`コマンド実行エラー: /${interaction.commandName}`, 'COMMAND', err);
            
            const errorMessage = {
                content: '❌ コマンド実行中にエラーが発生しました。',
                ephemeral: true
            };
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    }
    
    // ボタンクリック処理
    if (interaction.isButton()) {
        if (interaction.customId === 'register_pc') {
            try {
                await handleRegisterButton(interaction, 'pc');
            } catch (err) {
                console.error('PC登録ボタン処理エラー:', err);
                await interaction.reply({
                    content: '❌ エラーが発生しました。',
                    ephemeral: true
                });
            }
        } else if (interaction.customId === 'register_console') {
            try {
                await handleRegisterButton(interaction, 'console');
            } catch (err) {
                console.error('コンソール登録ボタン処理エラー:', err);
                await interaction.reply({
                    content: '❌ エラーが発生しました。',
                    ephemeral: true
                });
            }
        } else if (interaction.customId === 'view_my_rank') {
            try {
                await handleViewMyRankButton(interaction);
            } catch (err) {
                console.error('ランク表示ボタン処理エラー:', err);
                await interaction.reply({
                    content: '❌ エラーが発生しました。',
                    ephemeral: true
                });
            }
        } else if (interaction.customId === 'view_my_history') {
            try {
                await handleViewMyHistoryButton(interaction);
            } catch (err) {
                console.error('マッチ履歴表示ボタン処理エラー:', err);
                await interaction.reply({
                    content: '❌ エラーが発生しました。',
                    ephemeral: true
                });
            }
        }
    }
    
    // モーダル送信処理
    if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith('register_modal_')) {
            try {
                const platform = interaction.customId.split('_')[2];
                Logger.debug(`登録モーダル送信: ${platform}版 by ${interaction.user.tag}`, 'MODAL');
                await handleRegisterModal(interaction);
            } catch (err) {
                Logger.error('モーダル処理エラー', 'MODAL', err);
                await interaction.reply({
                    content: '❌ 登録処理中にエラーが発生しました。',
                    ephemeral: true
                });
            }
        }
    }
});

// Botのログイン
Logger.divider('🚀 Botを起動中');
Logger.info('Discordに接続中...', 'BOT');
client.login(TOKEN);