// ==UserScript==
// @name         X (Twitter) 专注阅读模式
// @namespace    https://github.com/PolarisHenry/x-focus-mode
// @version      1.8.11
// @description  X (Twitter) 沉浸专注与摸鱼神器：一键隐藏杂栏、Spotlight 极简搜索、纯净圆形悬浮球(默认停靠 S 左侧，修复点击展开后无法点击收起的交互Bug)、全新紧凑多Tab设置面板(彻底告别超长界面)、强力清剿政治暴论/反动口水战/币圈推广/黄推低俗/性病营销、随机跨领域通识专栏、一键批量同步全量垃圾词到Twitter官方屏蔽库、单键 J/K 顺滑翻页。
// @author       PolarisHenry
// @match        https://x.com/*
// @match        https://twitter.com/*
// @updateURL    https://fastly.jsdelivr.net/gh/PolarisHenry/x-focus-mode@main/x-focus-mode.user.js
// @downloadURL  https://fastly.jsdelivr.net/gh/PolarisHenry/x-focus-mode@main/x-focus-mode.user.js
// @homepageURL  https://github.com/PolarisHenry/x-focus-mode
// @supportURL   https://github.com/PolarisHenry/x-focus-mode/issues
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @run-at       document-start
// @noframes
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  /* ---------------- 系统与配置状态 ---------------- */
  const IS_MAC = /Mac|iPod|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

  const TYPO_LEVELS = [
    { label: '标准', size: '15px', line: '1.45', desc: '原版' },
    { label: '舒适', size: '16.5px', line: '1.62', desc: '推荐' },
    { label: '沉浸', size: '18px', line: '1.7', desc: '大字' }
  ];

  const DEFAULTS = {
    focus: true,       // 专注模式总开关
    hideLeft: true,    // 隐藏左侧导航栏
    hideRight: true,   // 隐藏右侧信息栏(搜索/趋势/推荐关注)
    keepSearch: true,  // 右栏隐藏时,保留右上角浮动搜索按钮 (默认展示 S)
    showBall: true,    // 显示页面内极简悬浮设置球
    width: 900,        // 内容列最大宽度(px)
    typoLevel: 1,      // 排版舒适度: 0 标准(15px), 1 舒适(16.5px), 2 沉浸(18px)
    stealthMode: false,// 摸鱼低调模式: 头像降噪灰度、隐藏蓝V徽标
    mediaBlur: true,   // 媒体防窥微模糊: 图片/视频默认微模糊遮罩,hover还原(默认开启)
    tabCloak: false,   // 标签页伪装: 将标题与图标伪装为 Google 文档
    blockCrypto: true, // 彻底屏蔽币圈推广: 无视 Binance/币安/炒币/合约/空投/代币引流
    blockPolitics: true,// 彻底屏蔽政治暴论与口水战: 净化认知、键政、戾气发泄与恶毒谩骂
    blockNsfw: true,   // 彻底屏蔽黄推与低俗: 净化梅毒/艾滋/做爱/约炮/色情/性病营销
    topicFilter: false,// 时间线主题过滤: 仅显示科技/认知/搞钱相关推文
    progressBar: true, // 屏幕顶端极细阅读滚动进度条
    pureBlack: false,  // OLED 纯黑极简背景
    ballPos: null,     // 悬浮球位置 {x, y}，默认为 null 自动居于 S 左侧
    activeTab: 'feed', // 当前激活的面板标签: 'feed' 专栏漫游, 'filter' 深度过滤, 'ui' 界面控制
  };
  const WIDTH_PRESETS = [750, 900, 1050, 1200];
  const WIDTHS = [600, 700, 800, 900, 1000, 1100, 1200];

  const stored = GM_getValue('fxState', {});
  // v1.8.5 迁移: 默认启用政治暴论与口水战屏蔽，重构认知与商业检索专栏
  if (!stored._v185_migrated) {
    stored.blockPolitics = true;
    stored._v185_migrated = true;
    try { GM_setValue('fxState', stored); } catch (_) {}
  }
  // v1.8.11 迁移: 默认启用黄推/低俗与性病营销屏蔽
  if (!stored._v1811_migrated) {
    if (stored.blockNsfw === undefined) stored.blockNsfw = true;
    stored._v1811_migrated = true;
    try { GM_setValue('fxState', stored); } catch (_) {}
  }
  const S = Object.assign({}, DEFAULTS, stored);
  const save = () => GM_setValue('fxState', S);

  const DOCS_FAVICON = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="%234285F4" d="M30 4H12C9.8 4 8 5.8 8 8v32c0 2.2 1.8 4 4 4h24c2.2 0 4-1.8 4-4V16L30 4z"/><path fill="%23A1C2FA" d="M30 4v12h12L30 4z"/><path fill="%23FFF" d="M14 22h20v2.5H14zm0 6h20v2.5H14zm0 6h14v2.5H14z"/></svg>';
  const DOCS_TITLE = 'Google 文档 - 2026 Q4 业务架构与跨系统协同方案演进规划';

  /* 强力屏蔽词: 币圈 / 炒币 / 合约 / 交易所 / 空投引流 */
  const CRYPTO_EXCLUDES = '-Binance -币安 -BNB -OKX -欧易 -crypto -空投 -撸毛 -代币 -Token -合约 -做空 -做多 -土狗 -铭文 -符文 -以太坊 -比特币 -BTC -ETH -SOL -返佣 -爆仓 -打新 -airdrop';

  /* 强力屏蔽词: 政治口水战 / 键政暴论 / 情绪发泄 / 恶毒谩骂 / 极端扣帽子 (彻底过滤垃圾内容) */
  const POLITICS_AND_RANT_EXCLUDES = '-政治 -政权 -中共 -共产党 -习近平 -川普 -特朗普 -大选 -独裁 -专制 -民主 -体制 -洗脑 -支那 -支人 -粉红 -五毛 -反贼 -润人 -反动 -汉奸 -走狗 -卖国贼 -境外势力 -美狗 -日杂 -辱华 -反华 -公知 -批斗 -洗地 -大外宣 -傻逼 -弱智 -脑残 -劣根性 -人矿 -互害 -贱民';

  /* 强力屏蔽词: 黄推 / 低俗 / 色情 / 约炮 / 性病营销垃圾 */
  const NSFW_EXCLUDES = '-梅毒 -艾滋 -做爱 -性病 -约炮 -操逼 -福利姬';

  /* 强力屏蔽词: 灰产割韭菜 / 营销号引流 */
  const SCAM_EXCLUDES = '-带徒弟 -私信我 -加微信 -日入 -月入十万';

  /* 聚合清洗排除词 (全专栏生效) */
  const NOISE_EXCLUDES = `${CRYPTO_EXCLUDES} ${POLITICS_AND_RANT_EXCLUDES} ${NSFW_EXCLUDES} ${SCAM_EXCLUDES}`;

  /* ---------------- 精选干货专栏检索配置 (高信噪比提纯 + 严拒政治与暴论) ---------------- */
  const CHANNELS = {
    all: {
      name: '🔥 综合精选 (科技+商业+出海)',
      q: `(AI OR 大模型 OR 独立开发 OR Cursor OR Claude OR "商业模式" OR "深度拆解" OR "出海" OR "MRR" OR "复盘" OR "方法论") min_faves:40 lang:zh -is:retweet ${NOISE_EXCLUDES}`
    },
    pure: {
      name: '🌊 纯净漫游 (全网只做过滤)',
      q: `(的 OR 了 OR 是 OR 在 OR 有) min_faves:40 lang:zh -is:retweet ${NOISE_EXCLUDES}`
    },
    knowledge: {
      name: '🧠 随机知识 (跨领域探索·无垃圾)',
      q: `("为什么" OR "原理" OR "机制" OR "原来如此" OR "科学" OR "宇宙" OR "历史" OR "心理学" OR "脑科学" OR "生物" OR "科普" OR "冷知识" OR "涨知识" OR "博弈论") min_faves:25 lang:zh -is:retweet ${NOISE_EXCLUDES}`
    },
    tech: {
      name: '🤖 科技 & 前沿 AI',
      q: `(AI OR 大模型 OR 独立开发 OR LLM OR Claude OR Cursor OR "开源项目" OR "全栈" OR "架构设计") min_faves:30 lang:zh -is:retweet ${NOISE_EXCLUDES}`
    },
    cognition: {
      name: '💡 商业深度拆解 & 思维模型',
      q: `("商业思考" OR "商业模式" OR "深度拆解" OR "思维模型" OR "决策模型" OR "复盘" OR "方法论" OR "增长策略" OR "读书笔记") min_faves:35 lang:zh -is:retweet ${NOISE_EXCLUDES}`
    },
    money: {
      name: '💰 搞钱 & 独立出海',
      q: `("搞钱" OR "独立开发" OR "出海" OR "变现" OR "盈利" OR "MRR" OR "冷启动" OR "副业项目") min_faves:25 lang:zh -is:retweet ${NOISE_EXCLUDES}`
    }
  };

  const TOPIC_REGEX = /(AI|大模型|LLM|Claude|Cursor|GPT|开源|架构|编程|代码|算法|前端|后端|全栈|SaaS|商业模式|思维模型|决策模型|复盘|复利|方法论|读书笔记|搞钱|副业|出海|变现|盈利|MRR|营收|独立开发|冷启动|产品经理|增长|科技|冷知识|科普|涨知识)/i;

  /* 强力屏蔽币圈/赌博/交易所引流垃圾 (Binance/OKX/合约/代币/空投) */
  const CRYPTO_SPAM_REGEX = /(Binance|币安|BNB|OKX|欧易|Huobi|火币|Gate\.io|空投|撸毛|代币|Token|Memecoin|meme币|土狗|铭文|符文|合约|做多|做空|跟单|带单|爆仓|平仓|以太坊|比特币|\bBTC\b|\bETH\b|\bSOL\b|\bUSDT\b|web3|Web3|区块链|质押|挖矿|返佣|邀请码|百倍币|千倍币|airdrop)/i;

  /* 强力屏蔽政治口水战、键政暴论、情绪发泄、人身攻击、极端扣帽子 */
  const POLITICS_SPAM_REGEX = /(中共|共产党|中国共产党|习近平|川普|特朗普|独裁|专制|民主宪政|支那|支人|粉红|五毛|反贼|殖人|润人|反动|反动派|汉奸|走狗|卖国贼|境外势力|美狗|日杂|辱华|反华|公知|阶级斗争|批斗|洗地|体制内|体制外|洗脑|配得上你的苦难|傻逼|弱智|脑残|劣根性|人矿|互害|贱民|大外宣)/i;

  /* 强力屏蔽黄推/低俗/色情/约炮/性病营销垃圾 (梅毒/艾滋/做爱/约炮/擦边引流) */
  const NSFW_SPAM_REGEX = /(梅毒|艾滋|做爱|性病|尖锐湿疣|淋病|约炮|约啪|操逼|骚逼|抽插|潮吹|颜射|淫水|射精|阴茎|阴道|裸照|裸聊|福利姬|门事件|吃瓜群|资源群|调教|露出|绿帽|偷拍|援交|嫖娼|迷奸|催情|换妻|兼职妹|楼凤|上门服务|破处|操我|反差婊|视频流出|探花|OnlyFans|onlyfans|门槛群)/i;

  /* ---------------- Twitter 官方屏蔽词库导入列表 (核心高频垃圾词) ---------------- */
  const OFFICIAL_MUTE_KEYWORDS = [
    // 币圈 / 炒币 / 合约 / 交易所 / 空投引流
    'Binance', '币安', 'BNB', 'OKX', '欧易', 'crypto', '空投', '撸毛', '代币', 'Token',
    '合约', '做空', '做多', '土狗', '铭文', '符文', '以太坊', '比特币', 'BTC', 'ETH',
    'SOL', 'USDT', '返佣', '爆仓', '打新', 'airdrop', 'Memecoin', '跟单', '带单',
    '百倍币', '千倍币', '质押', 'Huobi', '火币',
    // 政治口水战 / 键政暴论 / 情绪发泄 / 恶毒谩骂 / 极端扣帽子
    '中共', '共产党', '中国共产党', '习近平', '川普', '特朗普', '独裁', '专制', '体制内',
    '洗脑', '支那', '支人', '粉红', '五毛', '反贼', '润人', '殖人', '大外宣',
    '反动', '反动派', '汉奸', '走狗', '卖国贼', '境外势力', '美狗', '日杂', '辱华', '反华',
    '公知', '阶级斗争', '批斗', '洗地',
    '配得上你的苦难', '傻逼', '弱智', '脑残', '劣根性', '人矿', '互害', '贱民',
    // 黄推 / 低俗 / 色情 / 约炮 / 性病与低俗引流
    '梅毒', '艾滋', '做爱', '性病', '尖锐湿疣', '淋病', '约炮', '约啪', '操逼', '骚逼',
    '抽插', '潮吹', '颜射', '淫水', '射精', '阴茎', '阴道', '裸照', '裸聊', '福利姬',
    '门事件', '吃瓜群', '资源群', '调教', '露出', '绿帽', '偷拍', '援交', '嫖娼',
    '迷奸', '催情', '换妻', '兼职妹', '楼凤', '上门服务', '破处', '操我', '反差婊',
    '视频流出', '探花', 'OnlyFans', '门槛群',
    // 灰产引流
    '带徒弟', '私信我', '加微信', '日入', '月入十万'
  ];

  /* ---------------- SVG 极简图标资产 ---------------- */
  const ICON_FOCUS = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/></svg>`;
  const ICON_FOCUS_HEADER = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#1d9bf0" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.5" fill="#1d9bf0"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/></svg>`;
  const ICON_SEARCH = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>`;
  const ICON_CLOSE = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>`;

  /* ---------------- 样式注入 ---------------- */
  const css = `
  /* 隐藏右侧栏 */
  body.fx-hide-right [data-testid="sidebarColumn"] { display: none !important; }

  /* 中间内容列自动加宽并保持居中(依赖 :has,Chrome/Edge 105+、Firefox 121+、Safari 15.4+) */
  body.fx-wide main div:has([data-testid="primaryColumn"]) {
    max-width: 100% !important;
    width: 100% !important;
  }
  body.fx-wide main div:has(> div[data-testid="primaryColumn"]) {
    display: flex !important;
    justify-content: center !important;
    max-width: 100% !important;
  }
  body.fx-wide main [data-testid="primaryColumn"] {
    max-width: var(--fx-col-width, 900px) !important;
    width: 100% !important;
    margin-inline: auto !important;
  }

  /* ============ 时间线深度净化(专注模式开启时常驻生效，无需繁琐配置) ============ */
  /* 隐藏右下角发推悬浮大圆钮 */
  body.fx-wide a[data-testid="FloatingActionButton"],
  body.fx-hide-right a[data-testid="FloatingActionButton"] { display: none !important; }
  /* 隐藏信息流夹缝中的推荐关注模块 (Who to follow / Connect) */
  body.fx-wide div[data-testid="cellInnerDiv"]:has(aside[role="complementary"]) { display: none !important; }
  /* 隐藏 Premium 购买提示/订阅横幅/推荐升级插片 */
  body.fx-wide div[data-testid="cellInnerDiv"]:has(a[href*="/i/premium_sign_up"]),
  body.fx-wide div[data-testid="cellInnerDiv"]:has(a[href*="/i/verified-orgs-signup"]) { display: none !important; }

  /* ============ 屏幕顶部极细阅读进度条 ============ */
  #fx-progress {
    position: fixed; top: 0; left: 0; height: 2.5px; z-index: 2147483002;
    background: linear-gradient(90deg, #1d9bf0, #7856ff);
    width: 0%; pointer-events: none;
    box-shadow: 0 0 8px rgba(29, 155, 240, .75);
    transition: width .08s ease-out;
  }

  /* ============ 宽屏排版舒适度优化 ============ */
  body.fx-typo div[data-testid="tweetText"] {
    font-size: var(--fx-font-size, 16.5px) !important;
    line-height: var(--fx-line-height, 1.62) !important;
    letter-spacing: 0.01em !important;
  }

  /* ============ 媒体防窥微模糊 ============ */
  body.fx-media-blur div[data-testid="tweetPhoto"],
  body.fx-media-blur div[data-testid="videoPlayer"],
  body.fx-media-blur div[data-testid="videoComponent"] {
    filter: blur(14px) brightness(0.7);
    opacity: .6;
    transition: filter .25s cubic-bezier(0.16, 1, 0.3, 1), opacity .25s ease;
    border-radius: 12px;
  }
  body.fx-media-blur div[data-testid="tweetPhoto"]:hover,
  body.fx-media-blur div[data-testid="videoPlayer"]:hover,
  body.fx-media-blur div[data-testid="videoComponent"]:hover {
    filter: none;
    opacity: 1;
  }

  /* ============ 摸鱼低调阅读模式 ============ */
  /* 用户头像降噪灰度化，避免大红大绿头像引人注目 */
  body.fx-stealth div[data-testid="Tweet-User-Avatar"],
  body.fx-stealth img[src*="profile_images"] {
    filter: grayscale(85%) opacity(0.55) !important;
    transition: filter .2s ease, opacity .2s ease;
  }
  body.fx-stealth div[data-testid="Tweet-User-Avatar"]:hover,
  body.fx-stealth img[src*="profile_images"]:hover {
    filter: none !important;
    opacity: 1 !important;
  }
  /* 隐藏蓝V认证徽标、金色企业徽标，弱化社交属性 */
  body.fx-stealth svg[data-testid="icon-verified"] { display: none !important; }

  /* ============ OLED 纯黑极简背景 ============ */
  body.fx-pure-black,
  body.fx-pure-black #react-root,
  body.fx-pure-black main,
  body.fx-pure-black [data-testid="primaryColumn"] {
    background-color: #000000 !important;
  }

  /* ============ 页面内 UI:极简毛玻璃悬浮球 ============ */
  #fx-ball {
    position: fixed; z-index: 2147483005;
    width: 38px; height: 38px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    background: rgba(15, 20, 25, .82);
    backdrop-filter: blur(16px) saturate(180%);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, .15);
    color: #eff3f4;
    cursor: grab; user-select: none; touch-action: none;
    opacity: .8;
    transition: opacity .2s cubic-bezier(0.16, 1, 0.3, 1),
                transform .2s cubic-bezier(0.16, 1, 0.3, 1),
                border-color .2s ease,
                background .2s ease,
                box-shadow .2s ease;
    box-shadow: 0 4px 16px rgba(0, 0, 0, .35), inset 0 1px 0 rgba(255, 255, 255, .1);
  }
  #fx-ball:hover {
    opacity: 1;
    transform: scale(1.08);
    background: rgba(29, 155, 240, .18);
    border-color: rgba(29, 155, 240, .5);
    color: #1d9bf0;
    box-shadow: 0 6px 22px rgba(29, 155, 240, .25), inset 0 1px 0 rgba(255, 255, 255, .2);
  }
  #fx-ball.drag {
    opacity: 1;
    cursor: grabbing;
    transform: scale(0.96);
    border-color: #1d9bf0;
  }
  #fx-ball svg {
    width: 18px; height: 18px; pointer-events: none;
    transition: transform .25s cubic-bezier(0.16, 1, 0.3, 1);
  }
  #fx-ball:hover svg {
    transform: rotate(90deg);
  }

  /* ============ 页面内 UI:设置面板 ============ */
  #fx-panel {
    position: fixed; z-index: 2147483000; width: 330px; padding: 12px;
    display: none; max-height: 520px; overflow-y: auto;
    background: rgba(15, 20, 25, .94); color: #eff3f4;
    border: 1px solid rgba(255, 255, 255, .14); border-radius: 16px;
    box-shadow: 0 14px 40px rgba(0, 0, 0, .55), inset 0 1px 0 rgba(255, 255, 255, .1);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px);
    font: 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    animation: fx-fade-in .15s cubic-bezier(0.16, 1, 0.3, 1);
  }
  #fx-panel::-webkit-scrollbar { width: 5px; }
  #fx-panel::-webkit-scrollbar-track { background: transparent; }
  #fx-panel::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, .15); border-radius: 3px; }
  #fx-panel::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, .3); }

  @keyframes fx-fade-in {
    from { opacity: 0; transform: translateY(4px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  #fx-panel.open { display: block; }
  .fx-h {
    display: flex; justify-content: space-between; align-items: center;
    font-weight: 700; padding: 2px 4px 8px; font-size: 14.5px;
    margin-bottom: 4px;
  }
  .fx-h-title {
    display: flex; align-items: center; gap: 8px; color: #fff;
  }
  .fx-h button {
    display: flex; align-items: center; justify-content: center;
    background: rgba(255, 255, 255, .06); border: 1px solid rgba(255, 255, 255, .08);
    color: rgba(255, 255, 255, .65); cursor: pointer;
    width: 26px; height: 26px; border-radius: 50%;
    transition: all .15s ease;
  }
  .fx-h button:hover {
    color: #fff; background: rgba(255, 255, 255, .14);
    transform: scale(1.05);
  }

  /* 面板顶级多标签页导航 (极致紧凑, 高度减少65%) */
  .fx-tabs {
    display: flex; gap: 4px; padding: 2px 0 8px;
    border-bottom: 1px solid rgba(255, 255, 255, .08);
    margin-bottom: 6px;
  }
  .fx-tab-btn {
    flex: 1; padding: 5px 0; border-radius: 7px; border: 1px solid transparent;
    background: rgba(255, 255, 255, .04); color: rgba(255, 255, 255, .65);
    font-size: 11.5px; font-weight: 500; cursor: pointer; text-align: center;
    transition: all .15s ease; user-select: none;
  }
  .fx-tab-btn:hover {
    color: #eff3f4; background: rgba(255, 255, 255, .08);
  }
  .fx-tab-btn.active {
    background: rgba(29, 155, 240, .18); border-color: rgba(29, 155, 240, .35);
    color: #1d9bf0; font-weight: 600;
  }
  .fx-tab-content {
    display: flex; flex-direction: column; gap: 2px;
  }
  .fx-sec {
    font-size: 10.5px; font-weight: 700; text-transform: uppercase;
    letter-spacing: .06em; color: rgba(255, 255, 255, .38);
    padding: 6px 8px 2px; margin-top: 2px;
  }
  .fx-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 6px 8px; border-radius: 10px; cursor: pointer; user-select: none;
    transition: background .12s ease;
  }
  .fx-row:hover { background: rgba(255, 255, 255, .07); }
  .fx-kbd {
    display: inline-block;
    padding: 1px 5px;
    font-size: 10.5px;
    font-weight: 600;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    color: rgba(255, 255, 255, .7);
    background: rgba(255, 255, 255, .08);
    border: 1px solid rgba(255, 255, 255, .14);
    border-radius: 4px;
    box-shadow: 0 1px 0 rgba(0, 0, 0, .25);
    margin-left: 6px;
    vertical-align: 1px;
  }
  .fx-sw {
    width: 36px; height: 20px; border-radius: 9999px; flex: none;
    background: rgba(255, 255, 255, .2); position: relative;
    transition: background .18s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .fx-sw::after {
    content: ""; position: absolute; top: 2px; left: 2px;
    width: 16px; height: 16px; border-radius: 50%; background: #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, .3);
    transition: transform .18s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .fx-sw.on { background: #1d9bf0; }
  .fx-sw.on::after { transform: translateX(16px); }
  #fx-wr {
    width: calc(100% - 16px); margin: 4px 8px 6px;
    accent-color: #1d9bf0; cursor: pointer;
  }
  /* 排版分段选择器 */
  .fx-seg-wrap {
    display: flex; background: rgba(255, 255, 255, .08);
    border-radius: 9px; padding: 2.5px; gap: 3px;
    margin: 4px 8px 8px; border: 1px solid rgba(255, 255, 255, .08);
  }
  .fx-seg-item {
    flex: 1; border: none; background: transparent; color: rgba(255, 255, 255, .65);
    font-size: 11.5px; font-weight: 500; padding: 5px 0; border-radius: 7px;
    cursor: pointer; transition: all .16s ease; user-select: none;
    text-align: center;
  }
  .fx-seg-item:hover { color: #fff; background: rgba(255, 255, 255, .06); }
  .fx-seg-item.active {
    background: #1d9bf0; color: #fff; font-weight: 600;
    box-shadow: 0 1px 6px rgba(29, 155, 240, .35);
  }
  /* 列宽快捷挡位 */
  .fx-pills {
    display: flex; gap: 5px; margin: 2px 8px 6px;
  }
  .fx-pill {
    flex: 1; border: 1px solid rgba(255, 255, 255, .12); background: rgba(255, 255, 255, .05);
    color: rgba(255, 255, 255, .7); font-size: 11px; padding: 3px 0;
    border-radius: 6px; cursor: pointer; text-align: center; transition: all .15s;
  }
  .fx-pill:hover { background: rgba(255, 255, 255, .12); color: #fff; }
  .fx-pill.active {
    border-color: #1d9bf0; background: rgba(29, 155, 240, .2); color: #1d9bf0; font-weight: 600;
  }
  /* 干货专栏快捷直达 */
  .fx-channel-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin: 4px 8px 8px;
  }
  .fx-channel-btn {
    padding: 7px 8px; border-radius: 8px; font-size: 11.5px; font-weight: 500;
    background: rgba(255, 255, 255, .06); border: 1px solid rgba(255, 255, 255, .1);
    color: #eff3f4; cursor: pointer; text-align: center;
    transition: all .16s ease; user-select: none;
  }
  .fx-channel-btn:hover {
    background: rgba(29, 155, 240, .18); border-color: rgba(29, 155, 240, .4);
    color: #1d9bf0; transform: translateY(-1px);
  }
  .fx-channel-btn.primary {
    grid-column: 1 / -1;
    background: rgba(29, 155, 240, .14); border-color: rgba(29, 155, 240, .35);
    color: #1d9bf0; font-weight: 600;
  }
  .fx-channel-btn.primary:hover {
    background: #1d9bf0; color: #fff;
    box-shadow: 0 4px 14px rgba(29, 155, 240, .35);
  }
  .fx-channel-btn.highlight {
    grid-column: 1 / -1;
    background: rgba(0, 186, 124, .12); border-color: rgba(0, 186, 124, .35);
    color: #00ba7c; font-weight: 600;
  }
  .fx-channel-btn.highlight:hover {
    background: #00ba7c; color: #fff;
    box-shadow: 0 4px 14px rgba(0, 186, 124, .35);
  }
  .fx-foot {
    display: flex; justify-content: space-between; align-items: center;
    padding: 8px 6px 2px; margin-top: 4px; border-top: 1px solid rgba(255, 255, 255, .08);
  }
  #fx-reset {
    background: none; border: none; color: #1d9bf0; cursor: pointer;
    font-size: 12px; font-weight: 500; padding: 4px; border-radius: 4px;
    transition: opacity .15s;
  }
  #fx-reset:hover { opacity: .8; text-decoration: underline; }
  .fx-tip { opacity: .45; font-size: 11px; }

  /* ============ 官方屏蔽词库同步弹窗与横幅 ============ */
  #fx-sync-hud {
    position: fixed; inset: 0; z-index: 2147483647;
    background: rgba(0, 0, 0, .75); backdrop-filter: blur(8px);
    display: none; align-items: center; justify-content: center;
  }
  .fx-sync-modal {
    background: #16181c; border: 1px solid rgba(255, 255, 255, .15);
    border-radius: 16px; padding: 24px 28px; width: 420px; max-width: 90vw;
    box-shadow: 0 20px 48px rgba(0, 0, 0, .8); text-align: center; color: #fff;
  }
  .fx-sync-title { font-size: 15px; font-weight: 700; margin-bottom: 14px; color: #eff3f4; }
  .fx-sync-bar-wrap {
    width: 100%; height: 8px; background: rgba(255, 255, 255, .1);
    border-radius: 4px; overflow: hidden; margin-bottom: 12px;
  }
  .fx-sync-bar {
    width: 0%; height: 100%; background: linear-gradient(90deg, #1d9bf0, #00ba7c);
    transition: width .15s ease-out; border-radius: 4px;
  }
  .fx-sync-status { font-size: 12.5px; color: rgba(239, 243, 244, .7); min-height: 20px; word-break: break-all; }

  #fx-sync-banner {
    position: fixed; top: 12px; left: 50%; transform: translateX(-50%);
    z-index: 2147483000; width: 640px; max-width: 92vw;
    background: rgba(22, 24, 28, .94); backdrop-filter: blur(16px);
    border: 1px solid rgba(29, 155, 240, .4); border-radius: 14px;
    padding: 12px 18px; box-shadow: 0 10px 30px rgba(0, 0, 0, .6);
  }
  .fx-sync-banner-content { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
  .fx-sync-banner-text { display: flex; flex-direction: column; gap: 2px; }
  .fx-sync-banner-text strong { font-size: 13px; color: #1d9bf0; font-weight: 600; }
  .fx-sync-banner-text span { font-size: 11.5px; color: rgba(239, 243, 244, .7); }
  #fx-sync-banner-btn {
    padding: 7px 14px; border-radius: 20px; border: none;
    background: #1d9bf0; color: #fff; font-size: 12px; font-weight: 600;
    cursor: pointer; white-space: nowrap; transition: all .16s ease;
  }
  #fx-sync-banner-btn:hover { background: #1a8cd8; transform: scale(1.02); }

  .fx-action-card {
    margin: 4px 8px 8px; padding: 10px 12px; border-radius: 10px;
    background: rgba(255, 255, 255, .04); border: 1px solid rgba(255, 255, 255, .08);
    display: flex; flex-direction: column; gap: 8px;
  }
  .fx-action-title { font-size: 12.5px; font-weight: 600; color: #eff3f4; }
  .fx-action-desc { font-size: 11px; color: rgba(239, 243, 244, .6); line-height: 1.4; }
  .fx-btn-action {
    padding: 6px 12px; border-radius: 8px; border: 1px solid rgba(29, 155, 240, .4);
    background: rgba(29, 155, 240, .15); color: #1d9bf0; font-size: 11.5px; font-weight: 600;
    cursor: pointer; transition: all .16s ease; text-align: center;
  }
  .fx-btn-action:hover {
    background: #1d9bf0; color: #fff;
  }

  /* ============ 全屏 Mac Spotlight 聚焦单行搜索框 ============ */
  #fx-spotlight-overlay {
    position: fixed; inset: 0; z-index: 2147483600;
    display: flex; justify-content: center; align-items: flex-start;
    padding-top: 18vh;
    background: rgba(0, 0, 0, .55);
    backdrop-filter: blur(14px) saturate(180%);
    -webkit-backdrop-filter: blur(14px);
    opacity: 0; pointer-events: none;
    transition: opacity .18s cubic-bezier(0.16, 1, 0.3, 1);
  }
  #fx-spotlight-overlay.open {
    opacity: 1; pointer-events: auto;
  }
  .fx-spotlight-modal {
    width: 560px; max-width: calc(100vw - 32px);
    background: rgba(18, 21, 26, .92);
    border: 1px solid rgba(255, 255, 255, .16);
    border-radius: 9999px;
    box-shadow: 0 24px 64px rgba(0, 0, 0, .75), inset 0 1px 0 rgba(255, 255, 255, .15);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px);
    transform: translateY(-10px) scale(0.98);
    transition: transform .2s cubic-bezier(0.16, 1, 0.3, 1);
  }
  #fx-spotlight-overlay.open .fx-spotlight-modal {
    transform: translateY(0) scale(1);
  }
  .fx-spotlight-box {
    display: flex; align-items: center; padding: 12px 18px; gap: 12px; margin: 0;
  }
  .fx-spotlight-icon {
    display: flex; align-items: center; justify-content: center;
    color: #1d9bf0; flex: none;
  }
  .fx-spotlight-icon svg { width: 20px; height: 20px; }
  #fx-spotlight-input {
    flex: 1; background: transparent; border: none; outline: none;
    color: #eff3f4; font-size: 16.5px; font-weight: 400; line-height: 1.4;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  }
  #fx-spotlight-input::placeholder { color: rgba(239, 243, 244, .45); }
  #fx-spotlight-clear {
    background: rgba(255, 255, 255, .1); border: none; color: rgba(255, 255, 255, .6);
    width: 20px; height: 20px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all .15s; padding: 0; flex: none;
  }
  #fx-spotlight-clear:hover { background: rgba(255, 255, 255, .2); color: #fff; }
  /* ============ 老板键: Google Docs 沉浸式伪装层 ============ */
  #fx-boss-overlay {
    position: fixed; inset: 0; z-index: 2147483647;
    background: #f9fbfd; color: #202124;
    display: none; flex-direction: column;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    user-select: none; overflow: hidden;
  }
  #fx-boss-overlay.active { display: flex; }
  .fx-boss-header {
    height: 56px; background: #fff; border-bottom: 1px solid #dadce0;
    display: flex; align-items: center; padding: 0 16px; gap: 12px; flex: none;
  }
  .fx-boss-doc-icon { display: flex; align-items: center; }
  .fx-boss-title-wrap { flex: 1; display: flex; flex-direction: column; justify-content: center; }
  .fx-boss-doc-title {
    font-size: 15.5px; font-weight: 500; color: #1a73e8; display: flex; align-items: center; gap: 8px;
  }
  .fx-boss-saved { font-size: 11.5px; color: #5f6368; font-weight: normal; }
  .fx-boss-menubar {
    display: flex; gap: 12px; font-size: 12.5px; color: #3c4043; margin-top: 2px;
  }
  .fx-boss-header-right { display: flex; align-items: center; gap: 12px; }
  .fx-boss-share-btn {
    background: #1a73e8; color: #fff; padding: 5px 14px; border-radius: 9999px;
    font-size: 12.5px; font-weight: 500; display: flex; align-items: center; gap: 4px;
  }
  .fx-boss-avatar {
    width: 30px; height: 30px; border-radius: 50%; background: #0b8043; color: #fff;
    display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px;
  }
  .fx-boss-toolbar {
    height: 36px; background: #edf2fa; border-bottom: 1px solid #dadce0;
    display: flex; align-items: center; padding: 0 16px; gap: 10px; font-size: 12px; color: #444746;
    flex: none;
  }
  .fx-boss-tb-group { display: flex; gap: 10px; align-items: center; }
  .fx-boss-tb-sep { width: 1px; height: 16px; background: #c7c7c7; margin: 0 4px; }
  .fx-boss-tb-tip { margin-left: auto; font-size: 11px; color: #80868b; }
  .fx-boss-canvas {
    flex: 1; overflow-y: auto; background: #f0f4f9; padding: 24px 16px; display: flex; justify-content: center;
  }
  .fx-boss-page {
    width: 820px; min-height: 850px; background: #fff;
    padding: 56px 68px; box-shadow: 0 2px 8px rgba(0,0,0,.08); border-radius: 2px;
    color: #1f1f1f; line-height: 1.65; font-size: 13.5px;
  }
  .fx-boss-h1 { font-size: 21px; font-weight: 600; margin: 0 0 8px 0; color: #1f1f1f; }
  .fx-boss-meta { font-size: 11.5px; color: #70757a; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
  .fx-boss-page h2 { font-size: 15.5px; font-weight: 600; margin: 22px 0 8px 0; color: #1a73e8; }
  .fx-boss-page p { margin: 8px 0; }
  .fx-boss-table {
    width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 12.5px;
  }
  .fx-boss-table th, .fx-boss-table td {
    border: 1px solid #dadce0; padding: 8px 10px; text-align: left;
  }
  .fx-boss-table th { background: #f8f9fa; font-weight: 600; }
  .fx-boss-badge {
    display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 500;
  }
  .fx-boss-badge.done { background: #e6f4ea; color: #137333; }
  .fx-boss-badge.ing { background: #e8f0fe; color: #1a73e8; }
  .fx-boss-badge.todo { background: #f1f3f4; color: #5f6368; }

  /* ============ 右上角极简 Spotlight 胶囊触发入口 ============ */
  #fx-search-trigger {
    position: fixed; top: 14px; right: 18px; z-index: 2147482999;
    display: none; align-items: center; gap: 8px;
    height: 36px; padding: 0 12px; border-radius: 9999px;
    border: 1px solid rgba(255, 255, 255, .14); cursor: pointer;
    background: rgba(15, 20, 25, .82); color: #eff3f4;
    backdrop-filter: blur(16px) saturate(180%);
    -webkit-backdrop-filter: blur(16px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, .3), inset 0 1px 0 rgba(255, 255, 255, .1);
    transition: all .2s cubic-bezier(0.16, 1, 0.3, 1);
    font-size: 12.5px; font-weight: 500;
  }
  body.fx-search #fx-search-trigger { display: flex; }
  #fx-search-trigger:hover {
    transform: scale(1.04);
    background: rgba(29, 155, 240, .18);
    border-color: rgba(29, 155, 240, .5);
    color: #1d9bf0;
    box-shadow: 0 4px 20px rgba(29, 155, 240, .25), inset 0 1px 0 rgba(255, 255, 255, .2);
  }
  #fx-search-trigger svg { width: 15px; height: 15px; pointer-events: none; }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  (document.head || document.documentElement).appendChild(styleEl);

  /* ---------------- 左栏隐藏(JS inline 控制,SPA 重建后自动补) ---------------- */
  function syncLeftHeader() {
    const hide = document.body && document.body.classList.contains('fx-hide-left');
    document.querySelectorAll(
      'header[data-testid="app-header"], header[role="banner"], #react-root header'
    ).forEach((h) => { h.style.display = hide ? 'none' : ''; });
  }

  /* ---------------- 应用状态到页面 ---------------- */
  function apply() {
    if (!document.body) return;
    const dm = location.pathname.startsWith('/messages'); // 私信页保持原布局,避免影响会话导航
    const on = S.focus;
    const hideLeft = on && S.hideLeft && !dm;
    const hideRight = on && S.hideRight && !dm;

    document.body.classList.toggle('fx-hide-left', hideLeft);
    document.body.classList.toggle('fx-hide-right', hideRight);
    document.body.classList.toggle('fx-wide', hideLeft || hideRight);
    document.body.classList.toggle('fx-search', hideRight && S.keepSearch);

    // 宽屏排版舒适度:动态设置字号与行高
    const typo = TYPO_LEVELS[S.typoLevel] || TYPO_LEVELS[1];
    document.body.classList.toggle('fx-typo', on && S.typoLevel > 0);
    document.body.style.setProperty('--fx-font-size', typo.size);
    document.body.style.setProperty('--fx-line-height', typo.line);

    document.body.classList.toggle('fx-media-blur', !!S.mediaBlur);
    document.body.classList.toggle('fx-stealth', S.stealthMode);
    document.body.classList.toggle('fx-pure-black', on && S.pureBlack);
    document.body.style.setProperty('--fx-col-width', S.width + 'px');
    syncLeftHeader();
    syncProgressBar();
    applyTabCloak();
    filterTimelineTweets();

    // 右上角极简 Spotlight 胶囊入口:按需挂载/移除
    if (hideRight && S.keepSearch) mountSearchTrigger();
    else {
      const tr = document.getElementById('fx-search-trigger');
      if (tr) tr.remove();
    }

    // 悬浮球:按需挂载/移除
    if (S.showBall) mountBall();
    else {
      const b = document.getElementById('fx-ball');
      if (b) b.remove();
      closePanel();
    }

    // 检查并提示官方屏蔽词页面一键同步
    checkMutedKeywordsPage();
  }

  /* ---------------- 顶部阅读进度条 ---------------- */
  let progressEl = null;
  function updateProgress() {
    if (!S.focus || !S.progressBar) {
      if (progressEl) progressEl.style.width = '0%';
      return;
    }
    const h = document.documentElement.scrollHeight - window.innerHeight;
    const p = h > 0 ? Math.min(100, Math.max(0, (window.scrollY / h) * 100)) : 0;
    if (!progressEl) {
      progressEl = document.createElement('div');
      progressEl.id = 'fx-progress';
      document.body.appendChild(progressEl);
    }
    progressEl.style.width = p.toFixed(1) + '%';
  }
  function syncProgressBar() {
    if (S.focus && S.progressBar) {
      if (!progressEl) {
        progressEl = document.createElement('div');
        progressEl.id = 'fx-progress';
        document.body.appendChild(progressEl);
      }
      updateProgress();
    } else if (progressEl) {
      progressEl.remove();
      progressEl = null;
    }
  }
  window.addEventListener('scroll', () => requestAnimationFrame(updateProgress), { passive: true });

  /* ---------------- 摸鱼伪装: 标签页与老板键 ---------------- */
  let originalDocTitle = '';
  let originalFaviconHref = '';
  let bossOverlayEl = null;
  let isBossActive = false;

  function applyTabCloak() {
    if (S.tabCloak || isBossActive) {
      if (!originalDocTitle && !document.title.startsWith('Google 文档')) {
        originalDocTitle = document.title;
      }
      if (!originalFaviconHref) {
        const icon = document.querySelector('link[rel*="icon"]');
        if (icon) originalFaviconHref = icon.href;
      }
      const targetTitle = isBossActive
        ? 'Google 文档 - 2026 Q4 业务架构与跨系统协同方案演进规划'
        : 'Google 文档 - 团队协作笔记';
      if (document.title !== targetTitle) {
        document.title = targetTitle;
      }
      let icon = document.querySelector('link[rel*="icon"]');
      if (!icon) {
        icon = document.createElement('link');
        icon.rel = 'shortcut icon';
        document.head.appendChild(icon);
      }
      if (icon.href !== DOCS_FAVICON) {
        icon.href = DOCS_FAVICON;
      }
    } else {
      if (!isBossActive && originalFaviconHref) {
        const icon = document.querySelector('link[rel*="icon"]');
        if (icon && icon.href === DOCS_FAVICON) {
          icon.href = originalFaviconHref;
        }
      }
    }
  }

  function ensureBossOverlay() {
    if (bossOverlayEl) return bossOverlayEl;
    bossOverlayEl = document.createElement('div');
    bossOverlayEl.id = 'fx-boss-overlay';
    bossOverlayEl.innerHTML = `
      <header class="fx-boss-header">
        <div class="fx-boss-doc-icon">
          <svg viewBox="0 0 48 48" width="36" height="36">
            <path fill="#4285F4" d="M30 4H12C9.8 4 8 5.8 8 8v32c0 2.2 1.8 4 4 4h24c2.2 0 4-1.8 4-4V16L30 4z"/>
            <path fill="#A1C2FA" d="M30 4v12h12L30 4z"/>
            <path fill="#FFF" d="M14 22h20v2.5H14zm0 6h20v2.5H14zm0 6h14v2.5H14z"/>
          </svg>
        </div>
        <div class="fx-boss-title-wrap">
          <div class="fx-boss-doc-title">2026 Q4 业务架构与跨系统协同方案演进规划.docx <span class="fx-boss-saved">已保存到云端硬盘</span></div>
          <div class="fx-boss-menubar">
            <span>文件</span><span>编辑</span><span>视图</span><span>插入</span><span>格式</span><span>工具</span><span>扩展</span><span>帮助</span>
          </div>
        </div>
        <div class="fx-boss-header-right">
          <div class="fx-boss-share-btn">🔒 共享</div>
          <div class="fx-boss-avatar">P</div>
        </div>
      </header>

      <div class="fx-boss-toolbar">
        <div class="fx-boss-tb-group">
          <span>↶</span><span>↷</span><span>🖨️</span><span>100%</span>
        </div>
        <div class="fx-boss-tb-sep"></div>
        <div class="fx-boss-tb-group">
          <span>正文文本</span><span>Arial</span><span>11</span><span><b>B</b></span><span><i>I</i></span><span><u>U</u></span>
        </div>
        <div class="fx-boss-tb-sep"></div>
        <div class="fx-boss-tb-tip">按 B 或 ESC 键退出摸鱼伪装</div>
      </div>

      <div class="fx-boss-canvas">
        <div class="fx-boss-page">
          <h1 class="fx-boss-h1">2026 Q4 核心系统架构演进与敏捷里程碑方案</h1>
          <p class="fx-boss-meta">作者：架构研发组 · 最后更新：今日 10:42 · 密级：内部工作底稿</p>
          
          <h2>一、 现状分析与关键瓶颈</h2>
          <p>随着业务吞吐量持续攀升，现有单体服务在高峰期存在较明显的下游链路抖动。本次演进重点围绕数据流转异步化、主从数据库读写分离及边缘缓存命中率提升展开，确保核心业务 SLA 稳定达到 99.99%。</p>
          
          <h2>二、 核心改进指标与里程碑规划</h2>
          <table class="fx-boss-table">
            <thead>
              <tr><th>阶段</th><th>核心目标</th><th>责任人</th><th>排期节点</th><th>状态</th></tr>
            </thead>
            <tbody>
              <tr><td>Phase 1</td><td>数据链路异步解耦与压测验证</td><td>后端架构组</td><td>第 1-2 周</td><td><span class="fx-boss-badge done">已就绪</span></td></tr>
              <tr><td>Phase 2</td><td>热点数据多级缓存降级策略</td><td>中间件团队</td><td>第 3-4 周</td><td><span class="fx-boss-badge ing">进行中</span></td></tr>
              <tr><td>Phase 3</td><td>全链路灰度压测与告警收敛</td><td>SRE / QA</td><td>第 5-6 周</td><td><span class="fx-boss-badge todo">待评审</span></td></tr>
            </tbody>
          </table>

          <h2>三、 应急预案与联调协同机制</h2>
          <p>1. 针对大促与突发高流量场景，建立服务网格自动化熔断与流量削峰保护机制。</p>
          <p>2. 每日 10:00 举行核心模块跨团队站会，及时排查阻塞项并推动跨部门联调闭环。</p>
        </div>
      </div>
    `;
    document.body.appendChild(bossOverlayEl);
    bossOverlayEl.addEventListener('dblclick', () => toggleBossKey());
    return bossOverlayEl;
  }

  function toggleBossKey() {
    isBossActive = !isBossActive;
    const el = ensureBossOverlay();
    el.classList.toggle('active', isBossActive);

    if (isBossActive) {
      closePanel();
      closeSpotlight();
      document.querySelectorAll('video').forEach((v) => {
        try { v.pause(); } catch (_) {}
      });
      applyTabCloak();
    } else {
      applyTabCloak();
      if (!S.tabCloak && originalDocTitle) {
        document.title = originalDocTitle;
      }
    }
  }

  /* ---------------- 键盘极速推文流翻页 (J 上一页 / K 下一页) ---------------- */
  function navTweet(dir) {
    // 过滤掉被插件隐藏的推广推文以及零宽高不可见节点
    const tweets = Array.from(document.querySelectorAll('article[data-testid="tweet"]'))
      .filter((el) => {
        const wrap = el.closest('div[data-testid="cellInnerDiv"]');
        if (wrap && (wrap.style.display === 'none' || wrap.dataset.fxFiltered)) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 30 && rect.height > 30;
      });

    const currentY = window.scrollY || document.documentElement.scrollTop || 0;
    const headerHeight = 58; // 顶部粘性条安全避让高度

    if (!tweets.length) {
      window.scrollBy({ top: dir * Math.round(window.innerHeight * 0.65), behavior: 'smooth' });
      return;
    }

    if (dir > 0) {
      // k: 下一页 (向下滚动)
      const next = tweets.find((el) => el.getBoundingClientRect().top > headerHeight + 15);
      if (next) {
        const targetY = currentY + next.getBoundingClientRect().top - headerHeight - 8;
        window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
      } else {
        // 到底部或当前批次已浏览完，按视口高度 70% 步进触底加载新推文
        window.scrollBy({ top: Math.round(window.innerHeight * 0.7), behavior: 'smooth' });
      }
    } else {
      // j: 上一页 (向上滚动)
      if (currentY <= 60) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const prevList = tweets.filter((el) => el.getBoundingClientRect().top < headerHeight - 15);
      if (prevList.length) {
        const prev = prevList[prevList.length - 1];
        const targetY = currentY + prev.getBoundingClientRect().top - headerHeight - 8;
        window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }

  /* ---------------- 时间线本地高能主题与垃圾过滤 (币圈/政治/暴论/黄推/低俗) ---------------- */
  function filterTimelineTweets() {
    const shouldBlockCrypto = S.focus && S.blockCrypto;
    const shouldBlockPolitics = S.focus && S.blockPolitics;
    const shouldBlockNsfw = S.focus && S.blockNsfw;
    const shouldFilterTopic = S.focus && S.topicFilter;

    document.querySelectorAll('article[data-testid="tweet"]').forEach((el) => {
      const wrap = el.closest('div[data-testid="cellInnerDiv"]');
      if (!wrap) return;

      if (!shouldBlockCrypto && !shouldBlockPolitics && !shouldBlockNsfw && !shouldFilterTopic) {
        if (wrap.dataset.fxFiltered) {
          wrap.style.display = '';
          delete wrap.dataset.fxFiltered;
        }
        return;
      }

      const textEl = el.querySelector('div[data-testid="tweetText"]');
      const text = textEl ? textEl.innerText : '';

      // 1. 币圈 / Binance / 合约 / 空投等垃圾直接一票否决
      if (shouldBlockCrypto && text && CRYPTO_SPAM_REGEX.test(text)) {
        wrap.style.display = 'none';
        wrap.dataset.fxFiltered = 'crypto';
        return;
      }

      // 2. 政治口水战 / 键政暴论 / 情绪发泄与恶毒谩骂直接一票否决
      if (shouldBlockPolitics && text && POLITICS_SPAM_REGEX.test(text)) {
        wrap.style.display = 'none';
        wrap.dataset.fxFiltered = 'politics';
        return;
      }

      // 3. 黄推 / 低俗 / 色情 / 约炮 / 性病营销垃圾直接一票否决
      if (shouldBlockNsfw && text && NSFW_SPAM_REGEX.test(text)) {
        wrap.style.display = 'none';
        wrap.dataset.fxFiltered = 'nsfw';
        return;
      }

      // 4. 主题过滤 (仅当开启 topicFilter 时)
      if (shouldFilterTopic) {
        if (text && !TOPIC_REGEX.test(text)) {
          wrap.style.display = 'none';
          wrap.dataset.fxFiltered = 'topic';
          return;
        }
      }

      wrap.style.display = '';
      delete wrap.dataset.fxFiltered;
    });
  }

  /* ---------------- 打开精选专栏检索流 (默认热门 Top 高信噪比) ---------------- */
  function openChannel(key) {
    const ch = CHANNELS[key] || CHANNELS.all;
    const url = `/search?q=${encodeURIComponent(ch.q)}`;
    location.assign(url);
  }

  /* ---------------- Twitter 官方屏蔽词库批量导入逻辑 ---------------- */
  let isSyncingMutes = false;

  async function syncOfficialMuteKeywords() {
    if (isSyncingMutes) return;
    isSyncingMutes = true;

    // 创建或复用全屏/悬浮进度提示弹窗
    let hud = document.getElementById('fx-sync-hud');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'fx-sync-hud';
      hud.innerHTML = `
        <div class="fx-sync-modal">
          <div class="fx-sync-title">🛡️ 正在同步到 Twitter 官方屏蔽词库...</div>
          <div class="fx-sync-bar-wrap"><div class="fx-sync-bar" id="fx-sync-bar"></div></div>
          <div class="fx-sync-status" id="fx-sync-status">准备开始...</div>
        </div>
      `;
      document.body.appendChild(hud);
    }
    hud.style.display = 'flex';

    const bar = document.getElementById('fx-sync-bar');
    const status = document.getElementById('fx-sync-status');
    const total = OFFICIAL_MUTE_KEYWORDS.length;
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    // 获取当前账号的 CSRF Token (ct0)
    const getCookie = (name) => {
      const match = document.cookie.match(new RegExp('(^|; )' + name + '=([^;]*)'));
      return match ? decodeURIComponent(match[2]) : '';
    };
    const ct0 = getCookie('ct0');
    const bearer = 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

    let successCount = 0;
    let useDomFallback = false;

    // 优先尝试内部原生 API 极速批量同步
    for (let i = 0; i < total; i++) {
      const kw = OFFICIAL_MUTE_KEYWORDS[i];
      const pct = Math.round(((i + 1) / total) * 100);
      bar.style.width = pct + '%';
      status.textContent = `[${i + 1}/${total}] 正在同步: "${kw}"`;

      try {
        const res = await fetch('https://x.com/i/api/1.1/mutes/keywords/create.json', {
          method: 'POST',
          headers: {
            'authorization': bearer,
            'x-csrf-token': ct0,
            'x-twitter-active-user': 'yes',
            'x-twitter-auth-type': 'OAuth2Session',
            'content-type': 'application/x-www-form-urlencoded'
          },
          body: `keyword=${encodeURIComponent(kw)}&mute_surfaces=home_timeline%2Cnotifications&mute_options=home_timeline%2Cnotifications&duration=0`
        });

        if (res.ok) {
          successCount++;
        } else if (res.status === 404 || res.status === 403 || res.status === 401) {
          useDomFallback = true;
          break;
        }
      } catch (err) {
        useDomFallback = true;
        break;
      }
      await sleep(100);
    }

    // 若 API 受限则走设置页 DOM 模拟自动输入
    if (useDomFallback) {
      if (!location.pathname.includes('/settings/muted_keywords') && !location.pathname.includes('/settings/add_muted_keyword')) {
        status.textContent = 'API 受限，正在跳转至官方设置页进行模拟输入...';
        await sleep(600);
        location.assign('/settings/muted_keywords#fx-auto-sync');
        return;
      }

      status.textContent = '启用官方设置页自动输入中...';
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

      for (let i = 0; i < total; i++) {
        const kw = OFFICIAL_MUTE_KEYWORDS[i];
        const pct = Math.round(((i + 1) / total) * 100);
        bar.style.width = pct + '%';
        status.textContent = `[${i + 1}/${total}] 正在写入: "${kw}"`;

        if (document.body.innerText.includes(kw)) {
          successCount++;
          continue;
        }

        const addBtn = document.querySelector("a[href='/settings/add_muted_keyword']");
        if (addBtn) addBtn.click();
        await sleep(350);

        const input = document.querySelector("input[name='keyword']");
        if (input) {
          setter.call(input, kw);
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          await sleep(100);
          const saveBtn = document.querySelector("[data-testid='settingsDetailSave']");
          if (saveBtn) saveBtn.click();
          successCount++;
          await sleep(400);
        }
      }
    }

    bar.style.width = '100%';
    status.innerHTML = `<span style="color:#00ba7c;font-weight:600">✅ 成功同步 ${successCount} 个垃圾词到 Twitter 官方账号！</span>`;
    await sleep(1600);
    hud.style.display = 'none';
    isSyncingMutes = false;

    if (location.hash.includes('fx-auto-sync')) {
      history.replaceState(null, '', location.pathname);
    }
  }

  /* ---------------- 官方屏蔽词设置页自动提示条 ---------------- */
  function checkMutedKeywordsPage() {
    if (!location.pathname.startsWith('/settings/muted_keywords')) {
      const banner = document.getElementById('fx-sync-banner');
      if (banner) banner.remove();
      return;
    }
    if (document.getElementById('fx-sync-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'fx-sync-banner';
    banner.innerHTML = `
      <div class="fx-sync-banner-content">
        <div class="fx-sync-banner-text">
          <strong>🛡️ X 专注阅读模式 · 官方屏蔽词一键同步</strong>
          <span>一键将 ${OFFICIAL_MUTE_KEYWORDS.length} 个币圈炒币、合约、空投引流、黄推低俗、反动及政治口水垃圾词批量写入你的 Twitter 账号。</span>
        </div>
        <button id="fx-sync-banner-btn" type="button">⚡️ 一键自动同步 (${OFFICIAL_MUTE_KEYWORDS.length} 个垃圾词)</button>
      </div>
    `;
    document.body.appendChild(banner);

    document.getElementById('fx-sync-banner-btn').addEventListener('click', () => {
      syncOfficialMuteKeywords();
    });

    if (location.hash.includes('fx-auto-sync')) {
      setTimeout(() => syncOfficialMuteKeywords(), 800);
    }
  }

  /* ---------------- 页面内极简悬浮设置球 (默认停靠在 S 左侧) ---------------- */
  function mountBall() {
    if (!document.body || document.getElementById('fx-ball')) return;
    const ball = document.createElement('div');
    ball.id = 'fx-ball';
    ball.title = '专注模式设置 (点击打开面板，双击回顶部，可拖动)';
    ball.innerHTML = ICON_FOCUS;
    document.body.appendChild(ball);

    // 计算悬浮球的默认停靠位置：居于 S (搜索胶囊) 的左侧
    const calcDefaultBallPos = () => {
      const searchEl = document.getElementById('fx-search-trigger');
      const hasSearch = searchEl && getComputedStyle(searchEl).display !== 'none';
      const searchRight = 18;
      const searchWidth = hasSearch ? (searchEl.offsetWidth || 82) : 0;
      const gap = 10;
      const ballSize = 38;
      const x = hasSearch 
        ? (window.innerWidth - searchRight - searchWidth - gap - ballSize)
        : (window.innerWidth - searchRight - ballSize);
      return { x: Math.max(16, x), y: 13 };
    };

    if (!S.ballPos) {
      S.ballPos = calcDefaultBallPos();
      save();
    }
    const pos = S.ballPos;
    const clamp = () => {
      pos.x = Math.min(Math.max(pos.x, 8), innerWidth - 46);
      pos.y = Math.min(Math.max(pos.y, 8), innerHeight - 46);
    };
    const place = () => {
      clamp();
      ball.style.left = pos.x + 'px';
      ball.style.top = pos.y + 'px';
      repositionPanel();
    };
    place();

    let dragging = false, moved = false, sx = 0, sy = 0, ox = 0, oy = 0;
    ball.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      dragging = true;
      moved = false;
      sx = e.clientX;
      sy = e.clientY;
      ox = pos.x;
      oy = pos.y;
      ball.setPointerCapture(e.pointerId);
      ball.classList.add('drag');
      e.preventDefault();
    });
    ball.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (!moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        moved = true;
        closePanel(); // 仅当真正发生拖拽位移时才收起面板，彻底杜绝原地点击时误提前关闭导致无法收起
      }
      if (moved) {
        pos.x = ox + dx;
        pos.y = oy + dy;
        place();
      }
    });
    const up = (e) => {
      if (!dragging) return;
      dragging = false;
      ball.classList.remove('drag');
      try { ball.releasePointerCapture(e.pointerId); } catch (_) {}
      if (moved) {
        clamp();
        save(); // 拖动结束: 记住用户自定义位置
      } else {
        togglePanel(); // 原地点击: 展开/收起面板
      }
    };
    ball.addEventListener('pointerup', up);
    ball.addEventListener('pointercancel', (e) => {
      if (!dragging) return;
      dragging = false;
      ball.classList.remove('drag');
      try { ball.releasePointerCapture(e.pointerId); } catch (_) {}
    });
    ball.addEventListener('dblclick', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    window.addEventListener('resize', () => {
      if (!S.ballPos) {
        S.ballPos = calcDefaultBallPos();
      }
      place();
    });
  }

  /* ---------------- 设置面板 ---------------- */
  function ensurePanel() {
    let p = document.getElementById('fx-panel');
    if (!p) {
      p = document.createElement('div');
      p.id = 'fx-panel';
      document.body.appendChild(p);
      p.addEventListener('click', (e) => {
        // 普通开关行
        const row = e.target.closest('[data-k]');
        if (row) {
          const k = row.dataset.k;
          S[k] = !S[k]; save(); apply(); rebuildMenu(); renderPanel();
          return;
        }
        // 排版舒适度分段切换
        const seg = e.target.closest('[data-typo]');
        if (seg) {
          S.typoLevel = +seg.dataset.typo;
          save(); apply(); rebuildMenu(); renderPanel();
          return;
        }
        // 宽度快捷挡位药丸
        const pill = e.target.closest('[data-w]');
        if (pill) {
          S.width = +pill.dataset.w;
          save(); apply(); rebuildMenu(); renderPanel();
          return;
        }
        // 顶部多Tab切换
        const tabBtn = e.target.closest('[data-tab]');
        if (tabBtn) {
          S.activeTab = tabBtn.dataset.tab;
          save();
          renderPanel();
          repositionPanel();
          return;
        }
        // 精选干货专栏直达
        const ch = e.target.closest('[data-channel]');
        if (ch) {
          openChannel(ch.dataset.channel);
          closePanel();
          return;
        }
        if (e.target.closest('#fx-sync-mutes-btn')) {
          closePanel();
          syncOfficialMuteKeywords();
          return;
        }
        if (e.target.closest('#fx-reset')) {
          const keepPos = S.ballPos; // 位置不重置
          Object.assign(S, DEFAULTS, { ballPos: keepPos });
          save(); apply(); rebuildMenu(); renderPanel(); repositionPanel();
          return;
        }
        if (e.target.closest('#fx-close')) closePanel();
      });
      p.addEventListener('input', (e) => {
        if (e.target.id === 'fx-wr') {
          S.width = +e.target.value; save(); apply();
          const v = document.getElementById('fx-wv');
          if (v) v.textContent = S.width + 'px';
          // 同步药丸高亮
          p.querySelectorAll('.fx-pill').forEach((btn) => {
            btn.classList.toggle('active', +btn.dataset.w === S.width);
          });
        }
      });
      p.addEventListener('change', () => rebuildMenu()); // 滑杆松手后同步菜单文案
    }
    return p;
  }

  function renderPanel() {
    const p = document.getElementById('fx-panel');
    if (!p) return;
    const row = (key, label, hint, dim) => `
      <div class="fx-row" data-k="${key}"${dim ? ' style="opacity:.5"' : ''}>
        <span>${label}${hint ? `<span class="fx-kbd">${hint}</span>` : ''}</span>
        <span class="fx-sw ${S[key] ? 'on' : ''}"></span>
      </div>`;
    const sec = (title) => `<div class="fx-sec">${title}</div>`;
    const dim = !S.focus;

    const kbdFocus = IS_MAC ? 'F / ⌥F' : 'Alt+F';
    const kbdSearch = IS_MAC ? 'S / ⌥S' : 'Alt+S';

    const activeTab = S.activeTab || 'feed';

    let contentHtml = '';
    if (activeTab === 'feed') {
      contentHtml = `
        ${row('focus', '专注模式总开关', kbdFocus, false)}
        
        ${sec('精选干货专栏 (一键直达)')}
        <div class="fx-channel-grid">
          <button type="button" class="fx-channel-btn primary" data-channel="all">🔥 综合精选 (科技+商业+出海)</button>
          <button type="button" class="fx-channel-btn highlight" data-channel="pure">🌊 纯净漫游 (全网只做过滤·无币圈)</button>
          <button type="button" class="fx-channel-btn" data-channel="knowledge">🧠 随机跨领域知识</button>
          <button type="button" class="fx-channel-btn" data-channel="tech">🤖 科技 & AI</button>
          <button type="button" class="fx-channel-btn" data-channel="cognition">💡 商业深度拆解</button>
          <button type="button" class="fx-channel-btn" data-channel="money">💰 搞钱独立出海</button>
        </div>

        ${sec('排版模式')}
        <div class="fx-seg-wrap"${dim ? ' style="opacity:.5;pointer-events:none"' : ''}>
          ${TYPO_LEVELS.map((t, idx) => `
            <button type="button" class="fx-seg-item ${S.typoLevel === idx ? 'active' : ''}" data-typo="${idx}">
              ${t.label} <small style="opacity:.65">${t.size}</small>
            </button>
          `).join('')}
        </div>

        ${sec('内容列宽')}
        <div class="fx-pills"${dim ? ' style="opacity:.5;pointer-events:none"' : ''}>
          ${WIDTH_PRESETS.map((w) => `
            <button type="button" class="fx-pill ${S.width === w ? 'active' : ''}" data-w="${w}">
              ${w}px
            </button>
          `).join('')}
        </div>
        <input type="range" id="fx-wr" min="600" max="1200" step="50" value="${S.width}">
      `;
    } else if (activeTab === 'filter') {
      contentHtml = `
        ${sec('垃圾内容深度清剿')}
        ${row('blockCrypto', '彻底屏蔽币圈推广', '无视Binance/合约/空投', false)}
        ${row('blockPolitics', '彻底屏蔽政治暴论', '无视键政/吵架/戾气', false)}
        ${row('blockNsfw', '彻底屏蔽黄推与低俗', '无视梅毒/艾滋/做爱/约炮', false)}
        ${row('topicFilter', '时间线主题过滤', '只看科技/商业/出海', dim)}

        ${sec('Twitter 官方屏蔽词库联动')}
        <div class="fx-action-card">
          <div class="fx-action-title">🛡️ 官方屏蔽词库一键同步</div>
          <div class="fx-action-desc">将 ${OFFICIAL_MUTE_KEYWORDS.length} 个高频币圈、反动、黄推及政治口水词批量同步至 Twitter 账号屏蔽库，全平台（含手机端）永久净化。</div>
          <button type="button" id="fx-sync-mutes-btn" class="fx-btn-action">⚡️ 立即一键同步 (${OFFICIAL_MUTE_KEYWORDS.length} 个垃圾词)</button>
        </div>
      `;
    } else if (activeTab === 'ui') {
      contentHtml = `
        ${sec('职场摸鱼防窥')}
        ${row('tabCloak', '标签页伪装 (Google 文档)', '防看Tab', false)}
        ${row('stealthMode', '低调阅读模式 (头像灰度)', '', false)}
        ${row('mediaBlur', '媒体防窥微模糊', 'Hover清晰', false)}

        ${sec('界面与杂栏控制')}
        ${row('hideLeft', '隐藏左侧导航', '', dim)}
        ${row('hideRight', '隐藏右侧边栏', '', dim)}
        ${row('keepSearch', '保留浮动搜索按钮', kbdSearch, dim)}
        ${row('progressBar', '屏幕顶部阅读进度条', '', dim)}
        ${row('pureBlack', 'OLED 纯黑背景', '', dim)}
        ${row('showBall', '显示悬浮设置球', '', false)}
      `;
    }

    p.innerHTML = `
      <div class="fx-h">
        <div class="fx-h-title">${ICON_FOCUS_HEADER}<span>专注阅读</span></div>
        <button id="fx-close" type="button" title="关闭">${ICON_CLOSE}</button>
      </div>
      <div class="fx-tabs">
        <button type="button" class="fx-tab-btn ${activeTab === 'feed' ? 'active' : ''}" data-tab="feed">🧭 专栏漫游</button>
        <button type="button" class="fx-tab-btn ${activeTab === 'filter' ? 'active' : ''}" data-tab="filter">🛡️ 深度过滤</button>
        <button type="button" class="fx-tab-btn ${activeTab === 'ui' ? 'active' : ''}" data-tab="ui">⚙️ 界面控制</button>
      </div>
      <div class="fx-tab-content">
        ${contentHtml}
      </div>
      <div class="fx-foot">
        <button id="fx-reset" type="button">恢复默认</button>
        <span class="fx-tip">
          ${IS_MAC ? '<span class="fx-kbd">P</span> 面板 · <span class="fx-kbd">S</span> 搜索 · <span class="fx-kbd">J/K</span> 翻页 · <span class="fx-kbd">B</span> 老板键' : '<span class="fx-kbd">Alt+P</span> 面板 · <span class="fx-kbd">Alt+S</span> 搜索 · <span class="fx-kbd">J/K</span> 翻页 · <span class="fx-kbd">Alt+B</span> 老板键'}
        </span>
      </div>`;
  }

  function repositionPanel() {
    const p = document.getElementById('fx-panel');
    if (!p || !p.classList.contains('open')) return;
    const ball = document.getElementById('fx-ball');
    if (!ball) {
      p.style.right = '18px';
      p.style.top = '58px';
      p.style.left = 'auto';
      p.style.bottom = 'auto';
      return;
    }

    const r = ball.getBoundingClientRect();
    const pw = p.offsetWidth || 300;
    const ph = p.offsetHeight || 440;

    // 清除可能产生样式干扰的右/底绝对定位
    p.style.right = 'auto';
    p.style.bottom = 'auto';

    const gap = 10;
    const spaceBelow = innerHeight - r.bottom - gap - 12;
    const spaceAbove = r.top - gap - 12;

    let y;
    // 垂直避让策略：严禁面板与控制胶囊在垂直区间重叠
    if (r.top < innerHeight / 2) {
      // 胶囊在屏幕上半部分（默认停靠在右上角 S 旁边）：面板放在胶囊正下方展开
      if (spaceBelow >= Math.min(ph, 260) || spaceBelow >= spaceAbove) {
        y = r.bottom + gap;
        p.style.maxHeight = Math.min(520, Math.max(200, spaceBelow)) + 'px';
      } else {
        y = Math.max(8, r.top - ph - gap);
        p.style.maxHeight = Math.min(520, Math.max(200, spaceAbove)) + 'px';
      }
    } else {
      // 胶囊在屏幕下半部分：面板优先放在胶囊正上方展开
      if (spaceAbove >= Math.min(ph, 260) || spaceAbove >= spaceBelow) {
        y = r.top - ph - gap;
        if (y < 8) {
          y = 8;
          p.style.maxHeight = Math.min(520, Math.max(200, r.top - gap - 8)) + 'px';
        }
      } else {
        y = r.bottom + gap;
        p.style.maxHeight = Math.min(520, Math.max(200, spaceBelow)) + 'px';
      }
    }

    // 水平对齐策略
    let x;
    if (r.left > innerWidth / 2) {
      // 胶囊在右半屏（如默认停在右上角 S 旁边）：面板右外缘与胶囊右外缘对齐
      x = r.right - pw;
    } else {
      // 胶囊在左半屏：面板左外缘与胶囊左外缘对齐
      x = r.left;
    }

    // 视口水平安全边界保护
    x = Math.max(8, Math.min(innerWidth - pw - 8, x));

    p.style.left = Math.round(x) + 'px';
    p.style.top = Math.round(y) + 'px';
  }

  function openPanel() {
    if (spotlightEl && spotlightEl.classList.contains('open')) closeSpotlight();
    const p = ensurePanel();
    renderPanel();
    p.classList.add('open');
    repositionPanel();
  }
  function closePanel() {
    const p = document.getElementById('fx-panel');
    if (p) p.classList.remove('open');
  }
  function togglePanel() {
    const p = document.getElementById('fx-panel');
    if (p && p.classList.contains('open')) closePanel();
    else openPanel();
  }
  function syncPanel() {
    const p = document.getElementById('fx-panel');
    if (p && p.classList.contains('open')) {
      renderPanel();
      repositionPanel();
    }
  }

  /* ---------------- Spotlight 聚焦搜索 (纯单行极简搜索框) ---------------- */
  let spotlightEl = null;

  function ensureSpotlight() {
    if (spotlightEl) return spotlightEl;

    spotlightEl = document.createElement('div');
    spotlightEl.id = 'fx-spotlight-overlay';
    spotlightEl.innerHTML = `
      <div class="fx-spotlight-modal" role="dialog" aria-modal="true">
        <form class="fx-spotlight-box" id="fx-spotlight-form">
          <div class="fx-spotlight-icon">${ICON_SEARCH}</div>
          <input type="text" id="fx-spotlight-input" placeholder="搜索 X..." autocomplete="off" spellcheck="false">
          <button type="button" id="fx-spotlight-clear" title="清空" style="display:none">${ICON_CLOSE}</button>
        </form>
      </div>
    `;
    document.body.appendChild(spotlightEl);

    const input = spotlightEl.querySelector('#fx-spotlight-input');
    const form = spotlightEl.querySelector('#fx-spotlight-form');
    const clearBtn = spotlightEl.querySelector('#fx-spotlight-clear');

    input.addEventListener('input', () => {
      clearBtn.style.display = input.value ? 'flex' : 'none';
    });

    clearBtn.addEventListener('click', () => {
      input.value = '';
      clearBtn.style.display = 'none';
      input.focus();
    });

    const doSearch = () => {
      const q = input.value.trim();
      closeSpotlight();
      if (!q) {
        location.assign('/explore');
        return;
      }
      location.assign(`/search?q=${encodeURIComponent(q)}`);
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      doSearch();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeSpotlight();
      }
    });

    spotlightEl.addEventListener('click', (e) => {
      if (e.target === spotlightEl) closeSpotlight();
    });

    return spotlightEl;
  }

  function openSpotlight(query = '') {
    closePanel();
    const el = ensureSpotlight();
    el.classList.add('open');
    const input = el.querySelector('#fx-spotlight-input');
    const clearBtn = el.querySelector('#fx-spotlight-clear');
    if (query) input.value = query;
    if (clearBtn) clearBtn.style.display = input.value ? 'flex' : 'none';
    setTimeout(() => {
      input.focus();
      input.select();
    }, 40);
  }


  function closeSpotlight() {
    if (spotlightEl && spotlightEl.classList.contains('open')) {
      spotlightEl.classList.remove('open');
      const input = spotlightEl.querySelector('#fx-spotlight-input');
      if (input) input.blur();
    }
  }

  /* ---------------- 右上角极简 Spotlight 胶囊触发入口 ---------------- */
  function mountSearchTrigger() {
    if (!document.body || document.getElementById('fx-search-trigger')) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'fx-search-trigger';
    btn.title = IS_MAC ? '搜索 (按 S 或 ⌥S)' : '搜索 (按 S 或 Alt+S)';
    btn.innerHTML = `${ICON_SEARCH}<span>搜索</span><span class="fx-kbd">S</span>`;
    document.body.appendChild(btn);

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openSpotlight();
    });
  }

  /* ---------------- 全局点击:点外面关闭面板 ---------------- */
  document.addEventListener('click', (e) => {
    const p = document.getElementById('fx-panel');
    if (p && p.classList.contains('open') &&
        !p.contains(e.target) && !(e.target.closest && e.target.closest('#fx-ball'))) {
      closePanel();
    }
  }, true);

  /* ---------------- 油猴菜单 ---------------- */
  const menuIds = [];
  function rebuildMenu() {
    while (menuIds.length) { try { GM_unregisterMenuCommand(menuIds.pop()); } catch (_) {} }
    const add = (label, fn) => { try { menuIds.push(GM_registerMenuCommand(label, fn)); } catch (_) {} };
    const toggle = (key) => () => {
      S[key] = !S[key]; save(); apply(); rebuildMenu(); syncPanel();
    };

    const modText = IS_MAC ? '快捷键 F 或 ⌥F' : '快捷键 Alt+F';
    add(`🎯 专注模式:${S.focus ? '开启中' : '已关闭'}(${modText})`, toggle('focus'));
    add(`🎛 悬浮设置面板(${IS_MAC ? '快捷键 P 或 ⌥P' : '快捷键 P 或 Alt+P'})`, togglePanel);
    add('🔥 专栏: 综合精选 (科技+商业+出海)', () => openChannel('all'));
    add('🌊 专栏: 纯净漫游 (全网只做过滤·无币圈)', () => openChannel('pure'));
    add('🧠 专栏: 随机知识 (跨领域漫游·无垃圾)', () => openChannel('knowledge'));
    add('🤖 专栏: 科技 & 前沿 AI', () => openChannel('tech'));
    add('💡 专栏: 商业深度拆解 & 思维模型', () => openChannel('cognition'));
    add('💰 专栏: 搞钱 & 独立出海', () => openChannel('money'));
    add(`🛡️ 一键同步垃圾词到 Twitter 官方屏蔽库 (${OFFICIAL_MUTE_KEYWORDS.length} 词)`, () => syncOfficialMuteKeywords());
    add(`🚫 彻底屏蔽币圈推广:${S.blockCrypto ? '已开启(无视Binance/合约)' : '已关闭'}`, toggle('blockCrypto'));
    add(`🚫 彻底屏蔽政治暴论:${S.blockPolitics ? '已开启(无视键政/吵架)' : '已关闭'}`, toggle('blockPolitics'));
    add(`🚫 彻底屏蔽黄推低俗:${S.blockNsfw ? '已开启(无视色情/性病)' : '已关闭'}`, toggle('blockNsfw'));
    add(`🎯 时间线主题过滤:${S.topicFilter ? '已开启(只看相关)' : '已关闭'}`, toggle('topicFilter'));
    add(`💼 老板键伪装(${IS_MAC ? '单键 B 或 ⌥B' : '单键 B 或 Alt+B'})`, () => {
      toggleBossKey();
    });
    add(`📑 标签页伪装:${S.tabCloak ? '已开启(Google文档)' : '已关闭'}`, toggle('tabCloak'));
    add(`🥷 摸鱼低调模式:${S.stealthMode ? '已开启(头像降噪)' : '已关闭'}`, toggle('stealthMode'));
    add(`🔍 呼出搜索栏(${IS_MAC ? '单键 S 或 ⌥S' : '单键 S 或 Alt+S'})`, () => {
      openSpotlight();
    });
    add(`📖 排版模式:${TYPO_LEVELS[S.typoLevel].label}(点击循环)`, () => {
      S.typoLevel = (S.typoLevel + 1) % TYPO_LEVELS.length;
      save(); apply(); rebuildMenu(); syncPanel();
    });
    add(`🧭 左侧导航:${S.hideLeft ? '隐藏中' : '显示中'}`, toggle('hideLeft'));
    add(`📊 右侧栏:${S.hideRight ? '隐藏中' : '显示中'}`, toggle('hideRight'));
    add(`🙈 媒体防窥模糊:${S.mediaBlur ? '已开启' : '已关闭'}`, toggle('mediaBlur'));
    add(`🖤 OLED 纯黑背景:${S.pureBlack ? '已开启' : '已关闭'}`, toggle('pureBlack'));
    add(`📏 顶部阅读进度条:${S.progressBar ? '显示中' : '已隐藏'}`, toggle('progressBar'));
    add(`🔍 右上角常驻搜索胶囊:${S.keepSearch ? '已保留' : '不保留(默认)'}`, toggle('keepSearch'));
    add(`🔘 悬浮设置球:${S.showBall ? '显示中' : '已隐藏'}`, toggle('showBall'));
    add(`↔️ 内容列宽:${S.width}px(点击循环 600→1200)`, () => {
      const i = WIDTHS.indexOf(S.width);
      S.width = WIDTHS[(i + 1 + WIDTHS.length) % WIDTHS.length];
      save(); apply(); rebuildMenu(); syncPanel();
    });
    add(`⬆️ 回到页面顶部(${IS_MAC ? '按键 T 或 双击悬浮球' : 'Alt+T / 双击悬浮球'})`, () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------------- 快捷键(Mac友好:支持单键及⌥/Alt组合键) ---------------- */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (isBossActive) {
        toggleBossKey();
        return;
      }
      if (spotlightEl && spotlightEl.classList.contains('open')) {
        closeSpotlight();
        return;
      }
      closePanel();
      return;
    }

    const t = e.target;
    const isTextInput = (el) => {
      if (!el) return false;
      const tag = el.tagName;
      if (tag === 'TEXTAREA') return true;
      if (el.isContentEditable) return true;
      if (el.getAttribute && el.getAttribute('role') === 'textbox') return true;
      if (tag === 'INPUT') {
        const type = (el.type || '').toLowerCase();
        return !['checkbox', 'radio', 'range', 'button', 'submit', 'reset', 'color'].includes(type);
      }
      return !!(el.closest && el.closest('textarea, [contenteditable="true"], [role="textbox"], input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="button"])'));
    };

    if (isTextInput(t)) return;

    const k = e.key.toLowerCase();
    // 兼容: Mac 的 Option / Windows 的 Alt，或者纯单键操作(在非打字状态下直接按 P、F、S、T、B、J、K)
    const isMod = e.altKey || (IS_MAC && e.ctrlKey && !e.metaKey);
    const isSingle = !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey;

    if (isMod || isSingle) {
      if (k === 'b') {
        e.preventDefault();
        toggleBossKey();
      } else if (k === 'p') {
        e.preventDefault();
        togglePanel();
      } else if (k === 'f') {
        e.preventDefault();
        S.focus = !S.focus; save(); apply(); rebuildMenu(); syncPanel();
      } else if (k === 's') {
        e.preventDefault();
        openSpotlight();
      } else if (k === 't') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (k === 'j') {
        e.preventDefault();
        navTweet(-1); // J: 上一页 (向上滚动)
      } else if (k === 'k') {
        e.preventDefault();
        navTweet(1);  // K: 下一页 (向下滚动)
      }
    }
  }, true);

  /* ---------------- SPA 路由变化 ---------------- */
  const onRoute = () => setTimeout(apply, 50);
  for (const m of ['pushState', 'replaceState']) {
    const orig = history[m].bind(history);
    history[m] = function (...args) { const r = orig(...args); onRoute(); return r; };
  }
  window.addEventListener('popstate', onRoute);

  /* ---------------- DOM 变化保活(rAF 节流,每帧最多一次) ---------------- */
  let pending = false;
  new MutationObserver(() => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      if (!document.body) return;
      applyTabCloak();
      if (S.blockCrypto || S.blockPolitics || S.blockNsfw || S.topicFilter) filterTimelineTweets();
      syncLeftHeader(); // X 重建 header 后重新隐藏/恢复
      if (S.showBall && !document.getElementById('fx-ball')) mountBall();
      if (document.body.classList.contains('fx-search') && !document.getElementById('fx-search-trigger')) {
        mountSearchTrigger();
      }
      checkMutedKeywordsPage();
    });
  }).observe(document.documentElement, { childList: true, subtree: true });

  /* ---------------- 启动 ---------------- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
  rebuildMenu();
})();
