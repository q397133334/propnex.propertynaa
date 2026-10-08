import { createSignal } from 'solid-js';
import { render, delegateEvents } from 'solid-js/web';
import { getPanel } from '@violentmonkey/ui';
import { observe } from '@violentmonkey/dom';
// global CSS
import globalCss from './style.css';
// CSS modules
import styles, { stylesheet } from './style.module.css';

import { ceas24535, ceas24497 } from './ceas';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// 单个页面最大停留时间（毫秒），超时则自动跳回主页重新开始
const PAGE_TIMEOUT = 30000;
// PropertyGuru Agent Choice Awards 主页地址
const MAIN_URL = 'https://www.agentofferings.propertyguru.com.sg/agent-choice-awards';

const redirectToMain = () => {
  window.location.href = MAIN_URL;
};

// 带超时的轮询查找 DOM 元素，找不到返回 null
const waitForElement = async <T extends Element>(
  selector: string,
  timeoutMs: number = 10000
): Promise<T | null> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (!GM_getValue('autoRunning', false)) return null;
    const el = document.querySelector<T>(selector);
    if (el) return el;
    await sleep(500);
  }
  return null;
};

// 可投票的目标用户配置：ID、CEAS 号码数组、GM 存储键
const USER_OPTIONS = [
  { id: '24535', name: 'shanel liew', ceas: ceas24535, gmKey: 'ceas24535Number' },
  { id: '24497', name: 'kelvin thong', ceas: ceas24497, gmKey: 'ceas24497Number' },
];

const http = async (url: string, method: string, data: string, headers?: Record<string, string>) => {
  return await new Promise<VMScriptResponseObject<string>>((res, rej) => {
    GM_xmlhttpRequest({
      url: url,
      method: method,
      data: data,
      headers: headers,
      onload: function (resp) {
        res(resp as VMScriptResponseObject<string>);
      },
      onerror: function () {
        rej();
      }
    });
  });
};

// 浮动控制面板组件：选择目标用户 + 启动/停止自动投票
function Counter() {
  // 从 GM 存储恢复上次的状态（页面跳转后保持）
  const savedUserId = GM_getValue('selectedUserId', USER_OPTIONS[0].id);
  const savedRunning = GM_getValue('autoRunning', false);

  const [selectedUser, setSelectedUser] = createSignal(savedUserId);
  const [running, setRunning] = createSignal(savedRunning);

  // 启动投票：保存状态到 GM 存储，然后进入投票流程
  const startVoting = async (userId: string) => {
    setRunning(true);
    GM_setValue('autoRunning', true);
    GM_setValue('selectedUserId', userId);
    const user = USER_OPTIONS.find(u => u.id === userId) || USER_OPTIONS[0];
    await doVote(user);
  };

  // 用户手动点击 Start 按钮
  const handleStart = async () => {
    await startVoting(selectedUser());
  };

  // 用户手动点击 Stop 按钮：清除自动运行标记，下一轮不再继续
  const handleStop = () => {
    GM_setValue('autoRunning', false);
    setRunning(false);
  };

  return (
    <div class={styles.panel}>
      <select
        class={styles.select}
        value={selectedUser()}
        onChange={(e) => setSelectedUser(e.currentTarget.value)}
        disabled={running()}
      >
        {USER_OPTIONS.map(u => (
          <option value={u.id}>{u.name}</option>
        ))}
      </select>
      <button id="start" class={styles.plus1} onClick={handleStart} disabled={running()}>
        {running() ? '投票中...' : 'Start'}
      </button>
      {running() && (
        <button id="stop" class={styles.plus1} onClick={handleStop}>
          Stop
        </button>
      )}
    </div>
  );
}

// UI 初始化
async function initUI() {
  const panel = getPanel({
    theme: 'dark',
    style: [globalCss, stylesheet].join('\n')
  });

  Object.assign(panel.wrapper.style, {
    top: '10vh',
    right: '10vw'
  });

  //panel.setMovable(true);
  panel.show();

  render(Counter, panel.body);

  delegateEvents(["click"]);
}
// 自动投票核心逻辑
// 流程：主页(输入CEAS手机号) → 继续 → 投票页(点10票) → 提交 → 排行榜 → 自动跳回主页 → 循环
async function doVote(userConfig: typeof USER_OPTIONS[number]) {
  // 已停止，不再执行
  if (!GM_getValue('autoRunning', false)) return;

  const startTime = Date.now();
  let ceasNumber = GM_getValue(userConfig.gmKey, 1);
  if (ceasNumber < 1) ceasNumber = 1;
  // 从 CEAS 数组中轮询取号，使用正取模确保索引始终在有效范围内
  const length = userConfig.ceas.length - 1;
  const index = ((ceasNumber - 1) % length + length) % length;
  const ceasValue = userConfig.ceas[index];
  const href = window.location.href;

  const isTimedOut = () => Date.now() - startTime > PAGE_TIMEOUT;
  const isStopped = () => !GM_getValue('autoRunning', false);

  // ==================== 投票页面 ====================
  // URL 示例: .../vote/?vtsid=xxx
  if (href.indexOf('https://www.agentofferings.propertyguru.com.sg/agent-choice-awards/vote/?vtsid') > -1) {
    // 循环 1000 次是安全上限（每次间隔 1 秒，最多等 ~16 分钟），
    // 实际在投满 10 票后 break 跳出，不会跑到 1000 次
    for (let i = 0; i < 1000; i++) {
      // if (isStopped()) return;
      if (isTimedOut()) { redirectToMain(); return; }

      // 查找目标用户的投票按钮（页面每个代理有 2 个同名按钮，取第 2 个）
      const voteButtons = document.querySelectorAll(`button[data-id='${userConfig.id}']`);
      if (voteButtons.length > 1) {
        (voteButtons[1] as HTMLButtonElement).click();
      }

      // 检查是否已投满 10 票
      const totalEl = document.querySelector("#pg-vote-total-number");
      if (totalEl && totalEl.innerHTML === "10") {
        break;
      }

      await sleep(1000);
    }

    // 等待提交按钮出现（最多等 15 秒，每 500ms 检查一次）
    const submitBtn = await waitForElement<HTMLButtonElement>("#pg-vote-submit", 15000);
    //if (isStopped()) return;
    if (!submitBtn) { redirectToMain(); return; }

    submitBtn.click();

    // 提交后等 20 秒，验证页面是否已跳转，未跳转则主动回主页
    await sleep(30000);
    if (window.location.href.indexOf('vote/?vtsid') > -1) {
      redirectToMain();
    }
  }
  // ==================== 排行榜页面 ====================
  // 投票提交后会跳到这里，直接回主页进入下一轮
  else if (href.indexOf('https://www.agentofferings.propertyguru.com.sg/agent-choice-awards/vote/leaderboard/?') > -1) {
    redirectToMain();
  }
  // ==================== 主页 / 登录页 ====================
  // 输入 CEAS 注册手机号，点击继续进入投票页
  else {
    // 等待手机号输入框出现
    const mobileInput = await waitForElement<HTMLInputElement>("#pg-vote-mobile", 15000);
    if (isStopped()) return;
    if (!mobileInput) { redirectToMain(); return; }

    // 等待 Continue 按钮出现
    const continueBtn = await waitForElement<HTMLButtonElement>("#pg-vote-continue", 10000);
    if (isStopped()) return;
    if (!continueBtn) { redirectToMain(); return; }

    // 填入当前轮次的 CEAS 号码，并推进计数
    mobileInput.value = ceasValue;
    GM_setValue(userConfig.gmKey, ceasNumber + 1);

    await sleep(3000);
    continueBtn.click();

    // 等 3 秒检查是否有验证错误提示
    await sleep(3000);
    const msgEl = document.querySelector("#pg-vote-mobile-message");
    if (msgEl && msgEl.innerHTML.length > 0 && msgEl.innerHTML.indexOf('check') > -1) {
      // 号码验证失败，等 20 秒后刷新页面重试
      await sleep(10000);
      window.location.reload();
      return;
    }

    // 超时或页面无变化则回主页重来
    if (isTimedOut()) { redirectToMain(); return; }
    if (window.location.href === href) {
      redirectToMain();
    }
  }
}

async function main() {
  // 先渲染浮动控制面板
  initUI();

  // 如果上次是自动运行状态（页面跳转后恢复），自动继续投票
  const savedRunning = GM_getValue('autoRunning', false);
  if (savedRunning) {
    const savedUserId = GM_getValue('selectedUserId', USER_OPTIONS[0].id);
    const user = USER_OPTIONS.find(u => u.id === savedUserId) || USER_OPTIONS[0];
    await doVote(user);
  }
}

setTimeout(() => {
  // 页面加载完成后启动脚本
  main();
}, 10000);
console.log('所有资源加载完毕');
const div = document.createElement('div');
div.innerHTML = '所有资源加载完毕';
div.style.cssText = `
  position: fixed; top: 0; left: 0; z-index: 99999;
  background: #1890ff; color: #fff; padding: 8px 20px;
  font-size: 14px; font-weight: bold; border-radius: 0 0 8px 0;
  pointer-events: none;
`;
document.body.prepend(div);