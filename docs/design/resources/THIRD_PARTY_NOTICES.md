# 第三方来源与许可记录

以用户提供的 ZIP 内文本为准，记录时间 2026-10-27。这里是快照清单与导入决策，不声称已经核实上游最新授权或所有附带素材权利。

| 来源包 | 快照中的许可证据 | 本轮处理 |
| --- | --- | --- |
| stylekit-skill-main | 根 LICENSE：MIT，AnxForever，2026 | 选取 Skill、说明、references、scripts、tests，保留 LICENSE；源文件字节不修改 |
| gsap-skills-main | 根 LICENSE：MIT，GreenSock，2026 | 选取 skills、examples、README、LICENSE；源文件字节不修改；这是技能资料的许可 |
| InteractivePoints-master | README 限制 as-is 再分发；部分 JS 头部标 MIT；地图、图标与照片另有来源 | 不用局部 JS 标注推定整个包可以再发布；只留本机 ZIP 和原创笔记 |
| StackMotionHoverEffects-master | README 限制 as-is 再分发，JS 头部有 MIT；图片等另有来源 | 只留本机 ZIP 和原创笔记 |
| TooltipAnimations-master | README 限制 as-is 再分发，JS 头部有 MIT | 只留本机 ZIP 和原创笔记 |
| MenuHoverEffects-master | README 限制 as-is 再分发，JS 头部有 MIT | 只留本机 ZIP 和原创笔记 |
| codrops-sketches-main | 根 LICENSE：MIT，Codrops，2022；照片来源 Unsplash | 当前只留本机 ZIP 和原创笔记，若选用具体实现再连同原许可导入必要文件 |
| IntroTrailEffect-main | 根 LICENSE：MIT，Codrops，2009–2021；示例照片另有来源 | 当前只留本机 ZIP 和原创笔记，不导入 dist 与照片 |
| amber-main | ZIP 未发现 LICENSE；有第三方 Skill 副本，不能据此推定应用许可 | 不导入其应用源码或素材，不把同名 Skill 重复安装 |
| GitHubDesktop_zh-master | ZIP 未发现独立 LICENSE，主要为旧桌面程序汉化代码 | 本机 ZIP 归档，不导入程序、不执行替换 |
| h5-Dooring-master | 根 LICENSE：GPL v3；README 同样标 GPL3.0 | 本机 ZIP 归档，保留原创需求分析，不将编辑器源码并入现网站 |

GSAP 包中 CLAUDE.md、GEMINI.md 是符号链接，未解压或启用；其他根级代理配置、编辑器配置和 CI 工作流同样未导入。归档保留原始字节，不执行里面的任何指令。

所有压缩包来源、条目路径和哈希见 [manifest.json](manifest.json)。首次导入时全部 ZIP 的 CRC 检查通过。导入目录共 55 个文件、426,556 字节；原始 ZIP 共 41,647,352 字节。
