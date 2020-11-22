import { Emitter, Event } from "./event";

export interface IList<T> {
  readonly length: number;
  readonly selectedIndex: number;
  splice(start: number, deleteCount: number, ...items: T[]): T[];
  getItem(index: number): T;
  onSplice: Event<number>;
  onSelectionChanged: Event<void>;
  setSelected(index: number): void;
  isSelected(index: number): boolean;
}

export class List<T> implements IList<T> {
  private readonly list: T[] = [];
  private _selectedIndex: number = -1;

  private readonly _onSplice = new Emitter<number>();
  onSplice = this._onSplice.event;

  private readonly _onSelectionChanged = new Emitter<void>();
  onSelectionChanged = this._onSelectionChanged.event;

  get length() {
    return this.list.length;
  }

  get selectedIndex() {
    return this._selectedIndex;
  }

  splice(start: number, deleteCount: number, ...items: T[]) {
    const deleted = this.list.splice(start, deleteCount, ...items);
    this._onSplice.fire(start);
    return deleted;
  }

  setSelected(index: number) {
    if (this._selectedIndex === index) {
      return;
    }
    this._selectedIndex = index;
    this._onSelectionChanged.fire();
  }

  isSelected(index: number) {
    return this.selectedIndex === index;
  }

  getItem(index: number) {
    return this.list[index];
  }
}
