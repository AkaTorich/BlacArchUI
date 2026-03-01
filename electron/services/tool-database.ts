import fs from 'node:fs';
import path from 'node:path';
import Fuse from 'fuse.js';

export interface ToolEntry {
  id: string;
  name: string;
  version: string;
  categories: string[];
  description: string;
  descriptionRu: string;
  helpRu: string;
  url: string;
  command: string;
  usageExamples: { title: string; command: string; description: string }[];
  parameters: { flag: string; description: string }[];
}

export interface CategoryEntry {
  id: string;
  nameRu: string;
  nameEn: string;
  icon: string;
  description: string;
  toolCount?: number;
}

export class ToolDatabase {
  private tools: ToolEntry[] = [];
  private categories: CategoryEntry[] = [];
  private fuse!: Fuse<ToolEntry>;

  async load(): Promise<void> {
    const dataDir = this.getDataDir();

    const toolsPath = path.join(dataDir, 'tools.json');
    const categoriesPath = path.join(dataDir, 'categories.json');

    if (fs.existsSync(toolsPath)) {
      this.tools = JSON.parse(fs.readFileSync(toolsPath, 'utf-8'));
    }

    if (fs.existsSync(categoriesPath)) {
      this.categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'));
    }

    // Compute tool counts per category
    for (const cat of this.categories) {
      cat.toolCount = this.tools.filter((t) =>
        t.categories.includes(cat.id)
      ).length;
    }

    this.fuse = new Fuse(this.tools, {
      keys: [
        { name: 'name', weight: 2 },
        { name: 'descriptionRu', weight: 1 },
        { name: 'description', weight: 0.5 },
      ],
      threshold: 0.3,
      includeScore: true,
    });
  }

  private getDataDir(): string {
    // In dev: project root /data. In production: resources/data
    const devPath = path.join(__dirname, '../../data');
    if (fs.existsSync(devPath)) return devPath;

    const prodPath = path.join(process.resourcesPath, 'data');
    if (fs.existsSync(prodPath)) return prodPath;

    return devPath;
  }

  getAll(): ToolEntry[] {
    return this.tools;
  }

  byCategory(categoryId: string): ToolEntry[] {
    return this.tools.filter((t) => t.categories.includes(categoryId));
  }

  search(query: string): ToolEntry[] {
    if (!query.trim()) return this.tools;
    return this.fuse.search(query).map((r) => r.item);
  }

  getCategories(): CategoryEntry[] {
    return this.categories;
  }
}
