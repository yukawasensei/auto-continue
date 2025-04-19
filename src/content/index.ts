console.log('[AutoContinue] Content script injected.');

// --- 配置 ---
// 弹窗检测关键词（后续应从配置读取）
const POPUP_KEYWORDS = [
  '仍在观看', '是否仍在', '继续学习', 'Are you still there', 'Continue watching',
  'Keep watching', 'Session Timeout', '登录超时'
];
// 确认按钮关键词（后续应从配置读取）
const CONFIRM_BUTTON_KEYWORDS = [
  '确定', '继续', '确认', '是的', 'Yes', 'Confirm', 'Continue', 'I am here', 'OK'
];

// 防抖：防止短时间内重复触发点击
let clickingInProgress = false;
const CLICK_DEBOUNCE_MS = 1000; // 1秒内最多触发一次

// --- 核心逻辑 ---

/**
 * 检查元素及其子元素是否包含指定关键词列表中的任何一个
 * @param element 要检查的元素
 * @param keywords 关键词数组
 * @returns 如果找到关键词则返回 true，否则返回 false
 */
function elementContainsKeywords(element: Element, keywords: string[]): boolean {
  if (!element.textContent) return false;
  const text = element.textContent.trim().toLowerCase();
  // 检查元素本身的文本
  if (keywords.some(keyword => text.includes(keyword.toLowerCase()))) {
    return true;
  }
  // （可选）递归检查子元素，如果需要更精确匹配，可以取消注释
  // for (const child of element.children) {
  //   if (elementContainsKeywords(child, keywords)) {
  //     return true;
  //   }
  // }
  return false;
}

/**
 * 在指定容器内查找并点击包含确认关键词的按钮
 * @param containerElement 弹窗容器元素
 * @returns 如果成功点击则返回 true，否则返回 false
 */
function findAndClickButton(containerElement: Element): boolean {
  const buttons = containerElement.querySelectorAll('button, input[type="button"], a[role="button"]'); // 查找可能的按钮元素
  console.debug('[AutoContinue] Found potential buttons:', buttons);

  for (const button of buttons) {
    if (button instanceof HTMLElement) {
      const buttonText = (button.textContent || button.getAttribute('value') || button.getAttribute('aria-label') || '').trim().toLowerCase();
      if (CONFIRM_BUTTON_KEYWORDS.some(keyword => buttonText.includes(keyword.toLowerCase()))) {
        console.log(`[AutoContinue] Found confirmation button:`, button, `Text: "${buttonText}"`);
        try {
          // 使用 HTMLElement 的 click 方法
          button.click();
          console.log('[AutoContinue] Button clicked successfully.');
          return true;
        } catch (error) {
          console.error('[AutoContinue] Error clicking button:', error);
        }
      }
    }
  }
  console.debug('[AutoContinue] No confirmation button found in:', containerElement);
  return false;
}

/**
 * MutationObserver 的回调函数，处理 DOM 变化
 * @param mutationsList 变化记录列表
 * @param observer 观察者实例
 */
const handleMutations: MutationCallback = (mutationsList, observer) => {
  if (clickingInProgress) {
    return; // 如果正在处理点击，则忽略新的变化，简单防抖
  }

  for (const mutation of mutationsList) {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      mutation.addedNodes.forEach((node) => {
        // 只处理 Element 类型的节点
        if (node instanceof Element) {
          // 检查节点本身或其后代是否可能是我们要找的弹窗
          // 注意：这里直接检查节点本身，可以根据实际情况调整为检查更深层的后代
          if (elementContainsKeywords(node, POPUP_KEYWORDS)) {
            console.log('[AutoContinue] Potential popup detected:', node);

            // 尝试在检测到的弹窗内查找并点击按钮
            if (findAndClickButton(node)) {
              clickingInProgress = true;
              console.log('[AutoContinue] Auto-click initiated.');
              // 设置防抖，防止立即再次触发
              setTimeout(() => {
                clickingInProgress = false;
                console.log('[AutoContinue] Ready for next detection.');
              }, CLICK_DEBOUNCE_MS);
              // 找到并点击后，可以停止检查本次 mutation 中的其他节点（可选优化）
              return;
            }
          }
          // (可选) 如果弹窗可能嵌套在更深层，需要递归检查 node 的子元素
          // else {
          //   const potentialPopups = node.querySelectorAll('*'); // 查找所有后代元素
          //   for (const potentialPopup of potentialPopups) {
          //      if (elementContainsKeywords(potentialPopup, POPUP_KEYWORDS)) {
          //         console.log('[AutoContinue] Potential popup detected (deep scan):', potentialPopup);
          //         if (findAndClickButton(potentialPopup)) {
          //           clickingInProgress = true;
          //           setTimeout(() => { clickingInProgress = false; }, CLICK_DEBOUNCE_MS);
          //           return;
          //         }
          //      }
          //   }
          // }
        }
      });
    }
  }
};

// --- 初始化 ---
// 创建 MutationObserver 实例
const observer = new MutationObserver(handleMutations);

// 配置观察选项：监听子节点添加和移除，并监听整个子树
const config: MutationObserverInit = {
  childList: true,
  subtree: true,
};

// 开始观察 document.body
observer.observe(document.body, config);

console.log('[AutoContinue] MutationObserver started watching document.body.');

// (可选) 页面加载完成后也检查一次，以防弹窗已存在
// document.addEventListener('DOMContentLoaded', () => {
//   console.log('[AutoContinue] DOMContentLoaded - performing initial check.');
//   // 这里可以添加一个函数来扫描整个页面查找已存在的弹窗
// });
