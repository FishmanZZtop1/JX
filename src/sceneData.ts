export type SceneId = "nebula" | "galaxy" | "earth" | "earth-close" | "landing";

export type FlightScene = {
  id: SceneId;
  start: number;
  end: number;
  title: string;
  mobileTitle?: string;
  supporting: string;
};

export const FLIGHT_SCENES: FlightScene[] = [
  {
    id: "nebula",
    start: 0,
    end: 0.115,
    title: "星云，恒星的摇篮。",
    mobileTitle: "星云，\n恒星的摇篮。",
    supporting:
      "混沌、尘埃与气体，在引力的作用下汇聚、碰撞，最终点燃核聚变，发出光。\n每个人的内心深处，都藏着一片这样的星云。",
  },
  {
    id: "galaxy",
    start: 0.08,
    end: 0.37,
    title: "每一颗星星都有自己的故事，\n每一次闪烁都值得被看见。",
    mobileTitle: "每一颗星星都有\n自己的故事，\n每一次闪烁都\n值得被看见。",
    supporting: "我们的愿景是守护这片星云，让光，自然发生。",
  },
  {
    id: "earth",
    start: 0.31,
    end: 0.66,
    title: "回望地球，所有的喜怒哀惧\n终将在这个像素点里消散。",
    mobileTitle: "回望地球，\n所有的喜怒哀惧\n终将在这个\n像素点里消散。",
    supporting:
      "在这颗暗淡蓝点上，爱过，努力过，体验过，我们的一生才如此珍贵。\n用心理学、哲学与人文关怀，陪你辨识那些闪烁的、暗淡的、恒定的星辰，找到属于你的生命航向。",
  },
  {
    id: "earth-close",
    start: 0.62,
    end: 0.84,
    title:
      "你身体的每一个原子，\n都来自一颗爆炸的恒星。\n探索心灵，如同探索星海。",
    mobileTitle:
      "你身体的每一个原子，\n都来自一颗爆炸的恒星。\n探索心灵，\n如同探索星海。",
    supporting: "我们陪你，寻找内在的引力与光芒。",
  },
  {
    id: "landing",
    start: 0.82,
    end: 1,
    title: "锦宿",
    supporting: "在这里，没有催促与评判，\n只有自然的节律、安静的陪伴，\n以及属于你的片刻停留。",
  },
];

export function sceneIndexForProgress(progress: number): number {
  for (let index = FLIGHT_SCENES.length - 1; index >= 0; index -= 1) {
    const scene = FLIGHT_SCENES[index];
    if (progress >= scene.start && progress < scene.end) {
      return index;
    }
  }

  return progress >= 1 ? FLIGHT_SCENES.length - 1 : 0;
}
