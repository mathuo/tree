export interface ITreeNode<T> {
  readonly collapsed: boolean;
  readonly visible: boolean;
  readonly location: number[];
  readonly parent: ITreeNode<T> | undefined;
  readonly children: ITreeNode<T>[];
}

export class TreeNode<T> implements ITreeNode<T> {
  private _id: string;
  private _location: number[];
  private _collpased: boolean;
  private _visible: boolean;
  private _parent: ITreeNode<T>;
  private _renderNodeCount = 0;
  private _children: TreeNode<T>[] | undefined = undefined;

  constructor(id: string, data: T, parent: ITreeNode<T>) {
    this._parent = parent;
  }

  get collapsed() {
    return this._collpased;
  }

  get visible() {
    return this._visible;
  }

  get location() {
    return this._location;
  }

  get parent() {
    return this._parent;
  }

  get children() {
    return this._children;
  }
}

export interface ITreeRootNode<T> extends ITreeNode<T> {}

export class Root<T> implements ITreeRootNode<T> {
  private _id: string;
  private _location: number[];
  private _collpased: boolean;
  private _visible: boolean;
  private _renderNodeCount = 0;
  private _children: TreeNode<T>[] | undefined = undefined;

  get collapsed() {
    return this._collpased;
  }

  get visible() {
    return this._visible;
  }

  get location() {
    return this._location;
  }

  get parent(): ITreeNode<T> | undefined {
    return undefined;
  }

  get children() {
    return this._children;
  }
}
