export interface ITool {
  id: string;
  name: string;
  version: string;
  categories: string[];
  description: string;
  descriptionRu: string;
  helpRu: string;
  url: string;
  command: string;
  usageExamples: IUsageExample[];
  parameters: IToolParameter[];
}

export interface IUsageExample {
  title: string;
  command: string;
  description: string;
}

export interface IToolParameter {
  flag: string;
  description: string;
}

export interface ICategory {
  id: string;
  nameRu: string;
  nameEn: string;
  icon: string;
  description: string;
  toolCount?: number;
}
