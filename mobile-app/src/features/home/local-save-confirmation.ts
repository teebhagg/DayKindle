/** Resolve callers only when the write containing their edits completes. */
export type SaveConfirmation = { resolve: () => void; reject: (error: unknown) => void };

export class LocalSaveConfirmations {
  private pending: SaveConfirmation[] = [];

  request(): Promise<void> {
    return new Promise((resolve, reject) => this.pending.push({ resolve, reject }));
  }

  takePending(): SaveConfirmation[] {
    const batch = this.pending;
    this.pending = [];
    return batch;
  }
}

export async function confirmSavedWrite(write: Promise<void>, batch: SaveConfirmation[]): Promise<void> {
  try {
    await write;
    batch.forEach(({ resolve }) => resolve());
  } catch (error) {
    batch.forEach(({ reject }) => reject(error));
    throw error;
  }
}
