import { blankResume, uid, type Resume } from "@resume/model";
export function sampleResume(): Resume {
  const r = blankResume();
  r.title = "林知夏 · 产品经理";
  r.profile = {
    name: "林知夏",
    role: "产品经理",
    phone: "138 0012 3456",
    email: "zhixia.lin@example.com",
    location: "上海",
    website: "portfolio.example.com",
    avatar: "",
    summary:
      "3 年互联网产品经验，专注用户体验与业务增长。擅长从复杂需求中找到清晰的问题，用数据验证想法，让产品真正为用户创造价值。",
  };
  r.sections = [
    {
      id: uid(),
      title: "工作经历",
      kind: "work",
      visible: true,
      entries: [
        {
          id: uid(),
          title: "山海科技",
          subtitle: "产品经理 · 用户增长",
          location: "上海",
          start: "2023.07",
          end: "至今",
          description:
            "<ul><li>负责核心产品的用户增长与体验优化，覆盖从需求调研、方案设计到上线复盘的完整流程。</li><li>重构新用户引导流程，结合行为数据与用户访谈，将关键转化率提升 <strong>28%</strong>，次日留存提升 <strong>12%</strong>。</li><li>协同设计、研发与运营团队，推动 6 个重点项目按期交付，建立可复用的产品实验机制。</li></ul>",
        },
        {
          id: uid(),
          title: "微光网络",
          subtitle: "助理产品经理",
          location: "杭州",
          start: "2022.07",
          end: "2023.06",
          description:
            "<ul><li>参与企业协作平台的产品设计，完成 20+ 场客户访谈，将业务需求整理为可落地的产品方案。</li><li>搭建数据看板与反馈闭环，帮助团队缩短 <strong>30%</strong> 的问题响应时间。</li></ul>",
        },
      ],
    },
    {
      id: uid(),
      title: "项目经历",
      kind: "project",
      visible: true,
      entries: [
        {
          id: uid(),
          title: "「向内」习惯养成工具",
          subtitle: "独立产品项目 · 产品 / 设计",
          location: "",
          start: "2024.03",
          end: "2024.08",
          description:
            "<ul><li>从 0 到 1 设计轻量级习惯记录工具，完成用户研究、交互原型与产品上线。</li><li>通过社区冷启动获得首批 <strong>2,000+</strong> 用户，持续迭代提醒与数据回顾功能。</li></ul>",
        },
      ],
    },
    {
      id: uid(),
      title: "教育经历",
      kind: "education",
      visible: true,
      entries: [
        {
          id: uid(),
          title: "浙江大学",
          subtitle: "信息管理与信息系统 · 本科",
          location: "杭州",
          start: "2018.09",
          end: "2022.06",
          description: "<p>GPA 3.8 / 4.0 · 校级优秀毕业生 · 国家励志奖学金</p>",
        },
      ],
    },
    {
      id: uid(),
      title: "专业技能",
      kind: "skills",
      visible: true,
      entries: [
        {
          id: uid(),
          title: "",
          subtitle: "",
          location: "",
          start: "",
          end: "",
          description:
            "<p><strong>产品设计</strong>：需求分析、用户研究、交互设计、产品规划</p><p><strong>工具与数据</strong>：Figma、SQL、Excel、数据分析、A/B 测试</p><p><strong>语言能力</strong>：英语 CET-6，可作为工作语言</p>",
        },
      ],
    },
  ];
  return r;
}
