import { createSignal, onMount } from 'solid-js';
import { render, delegateEvents } from 'solid-js/web';
import { getPanel } from '@violentmonkey/ui';
import { observe } from '@violentmonkey/dom';
// global CSS
import globalCss from './style.css';
// CSS modules
import styles, { stylesheet } from './style.module.css';

// API 调用层
const getUra = async () => {
  const url = "https://pa-production.propnex.net/index.php/scrape/uraList?";
  return await http(url, "get", "");
};

const saveUrl = async (key: string, names: string[]) => {
  const url = "https://pa-production.propnex.net/index.php/scrape/saveUra";
  const data = "letters=" + encodeURIComponent(key) + "&names=" + encodeURIComponent(names.join("##"));
  return await http(url, "POST", data, {
    'Content-type': 'application/x-www-form-urlencoded' as string
  });
};

const clearUrl = async () => {
  return await http("https://pa-production.propnex.net/index.php/scrape/clearUra?", "get", "");
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

// 主组件
function Counter() {
  const [getCount, setCount] = createSignal(0);

  const start = async () => {
    let key = document.querySelector("#tbBldgStName") as HTMLInputElement;
    let search = document.querySelector("#btnCheckBldgStName") as HTMLButtonElement;
    let hidden = document.querySelector("input[name='cf-turnstile-response']") as HTMLInputElement;
    let checkboxStreet = document.querySelector("#checkboxStreet") as HTMLInputElement;

    while (true) {
      // 等待验证码令牌
      while (hidden.value == '') {
        hidden = document.querySelector("input[name='cf-turnstile-response']") as HTMLInputElement;
        console.log("input[name='cf-turnstile-response']");
        await sleep(1000);
      }

      // 获取下一个查询关键字
      const { response, status } = await getUra();

      if (status == 200) {
        if (response == "" || response == null) {
          // 队列为空，清空并重新加载
          await clearUrl();
          window.location.reload();
          break;
        }

        // 填入关键字，取消街道勾选，点击搜索
        key.value = response;
        checkboxStreet.checked = false;
        search.click();

        // 等待搜索结果表格出现
        let count = 0;
        while (document.querySelector("#searchResultDiv > div > table") == null && count < 20) {
          console.log("#searchResultDiv > div > table");
          await sleep(1000);
          count++;
        }

        if (count >= 20) {
          // 超时，保存空结果
          await saveUrl(response, []);
          break;
        }

        // 提取表格数据
        let table = document.querySelector("#searchResultDiv > div > table") as HTMLTableElement;
        let names = [];
        for (let i = 1; i < table.rows.length; i++) {
          let cell = table.rows[i].cells[0];
          console.log(cell.lastElementChild?.textContent ?? '');
          names.push(cell.lastElementChild?.textContent ?? '');
        }
        await sleep(5000);
        if(document.querySelector("body > wog-sentiments") != null){
          document.querySelector("body > wog-sentiments")?.remove();
        }
        // 保存结果
        await saveUrl(response, names);
      }

      await sleep(10000);
    }
  };

  onMount(async () => {
    await start();
  });

  return (
    <div>
      <button id="start" class={styles.plus1} onClick={start}>
        Start
      </button>
      <p>Drag me</p>
      <p>
        <span class={styles.count}>{getCount()}</span> people think this is amazing.
      </p>
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

  panel.setMovable(true);
  panel.show();

  render(Counter, panel.body);

  // 监听 DOM 变化，保持搜索字段可见
  observe(document.body, () => {
    let searchStreetBldgField = document.querySelector("#searchStreetBldgField") as HTMLElement;
    searchStreetBldgField.classList.remove("is-hidden");

    let checkboxStreet = document.querySelector("#checkboxStreet") as HTMLInputElement;
    checkboxStreet.checked = false;
  });

  delegateEvents(["click"]);
}

// 启动
initUI();