export type Space = {
  id: string;
  name: string;
  spaceType: number;
  favoriteFlag: number;
  isArchived: number;
  taskCount?: number;
  questionCount?: number;
};


export type SpacesState = {
  chat: Space[];
  task: Space[];
  question: Space[];
};
