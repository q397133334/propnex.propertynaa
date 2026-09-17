# propertynaa-script

PropertyNAA 数据采集用户脚本 —— 基于 [Violentmonkey](https://violentmonkey.github.io/) / [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展运行的自动化脚本，用于在 [PropertyNAA e-Service](https://digitalservice.propertynaa.gov.sg/eservice/search) 页面上自动搜索并采集房地产数据。

## 技术栈

- **[SolidJS](https://www.solidjs.com/)** — 响应式 UI 框架
- **TypeScript** — 类型安全的开发体验
- **[Rollup](https://rollupjs.org/)** — 模块打包
- **[Violentmonkey](https://violentmonkey.github.io/)** — 用户脚本运行环境
- **[@violentmonkey/ui](https://github.com/violentmonkey/vm-ui)** — Violentmonkey 官方 UI 面板组件
- **[@violentmonkey/dom](https://github.com/violentmonkey/vm-dom)** — Violentmonkey DOM 工具库
- **[Babel](https://babeljs.io/)** — JavaScript 编译转换
- **[UnoCSS](https://unocss.dev/)** — 原子化 CSS 引擎
- **[ESLint](https://eslint.org/)** + **[Prettier](https://prettier.io/)** — 代码规范与格式化
- **[Husky](https://typicode.github.io/husky/)** + **[lint-staged](https://github.com/lint-staged/lint-staged)** — Git Hooks 自动化

## 功能说明

本脚本运行在 PropertyNAA e-Service 搜索页面上，主要功能包括：

1. **自动化搜索** — 从后端 API 获取待搜索的关键字，自动填入搜索框并执行搜索
2. **数据提取** — 解析搜索结果表格，提取目标数据
3. **结果回传** — 将采集到的数据通过 API 保存到后端服务
4. **可视化面板** — 使用 Violentmonkey UI 面板展示运行状态和操作按钮
5. **队列管理** — 支持搜索队列的清空和重新加载

## 目录结构

```
vmk_script/
├── .husky/                 # Git Hooks 配置
├── dist/                   # 构建输出
│   └── propertynaa-script.user.js  # 编译后的用户脚本
├── src/
│   ├── awesome-script/
│   │   ├── index.ts        # 入口文件
│   │   ├── app.tsx         # 主应用组件 (SolidJS)
│   │   ├── meta.js         # 用户脚本元数据 (UserScript Header)
│   │   ├── style.css       # 全局样式
│   │   └── style.module.css # CSS Modules 样式
│   └── types/
│       ├── css.d.ts        # CSS 模块类型声明
│       └── vm.d.ts         # Violentmonkey 类型声明
├── babel.config.cjs        # Babel 配置
├── eslint.config.mjs       # ESLint 配置
├── rollup.config.mjs       # Rollup 构建配置
├── package.json            # 项目配置与依赖
├── .browserslistrc         # 浏览器兼容性配置
├── .editorconfig           # 编辑器配置
├── .npmrc                  # npm 配置
└── LICENSE                 # MIT 许可证
```

## 快速开始

### 环境要求

- **Node.js** >= 18
- 包管理器: npm / yarn / pnpm

### 安装依赖

```sh
npm install
```

### 开发模式

启动 Rollup 监听模式，代码变更时自动重新编译：

```sh
npm run dev
```

### 生产构建

执行代码检查、清理旧文件后编译生产版本：

```sh
npm run build
```

### 代码检查

```sh
# 仅检查
npm run lint

# 自动修复
npm run lint:fix
```

## 安装脚本

1. 首先在浏览器中安装 [Violentmonkey](https://violentmonkey.github.io/get-it/) 或 [Tampermonkey](https://www.tampermonkey.net/) 扩展
2. 运行 `npm run dev` 或 `npm run build` 编译脚本
3. 打开浏览器的 Violentmonkey/Tampermonkey 管理面板
4. 导入 `dist/propertynaa-script.user.js` 文件，或直接将文件内容复制粘贴到新脚本中
5. 确保脚本已启用，访问 [PropertyNAA e-Service 搜索页面](https://digitalservice.propertynaa.gov.sg/eservice/search) 即可看到控制面板

## 脚本匹配规则

脚本会自动注入到以下页面：
- `https://digitalservice.propertynaa.gov.sg/eservice/search`

## 依赖的 GM 权限

- `GM_addStyle` — 动态添加样式
- `GM_xmlhttpRequest` — 跨域 HTTP 请求

## 外部 CDN 依赖

脚本运行时需要以下外部资源（通过 `@require` 加载）：
- `@violentmonkey/dom@2`
- `@violentmonkey/ui@0.7`

## 许可证

[MIT](LICENSE) © propnex.fg