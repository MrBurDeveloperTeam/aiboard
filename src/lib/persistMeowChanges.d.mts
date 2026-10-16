export function matchLines(before: string[], after: string[]): number[];
export function planMeowChanges(configId: string, rows: any[], timings: any[], before: any, after: any, uuid?: () => string): any[];
export function executeMeowOperation(client: any, owner: string, op: any, isActive?: () => boolean): Promise<void>;
export function createMeowSaver(client: any, owner: string, row: any, initial: any,
  onStatus: (status: string, error: string) => void, delay?: number): {
    update(next: any): void;
    retry(): Promise<void>;
    dispose(): Promise<void>;
  };
