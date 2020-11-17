enum TreeVisibility {
  Hidden,
  Visible,
}

interface ITreeNode<T> {
  readonly collapsed: boolean;
  readonly visible: boolean;
  readonly location: number[];
  readonly parent: ITreeNode<T> | undefined;
  readonly children: ITreeNode<T>[];
}

class TreeNode<T> implements ITreeNode<T> {
  private _id: string;
  private _location: number[];
  private _collpased: boolean;
  private _visible: boolean;
  private _parent: ITreeNode<T>;
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

  get parent() {
    return this._parent;
  }

  constructor(id: string, data: T) {}
}

interface ITreeRootNode<T> extends ITreeNode<T> {}

class Root<T> implements ITreeRootNode<T> {
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
}

export class Tree<T> {
  private _element: HTMLElement;
  private _nodes = new Map<string, ITreeNode<T>>();
  private _root: ITreeRootNode<T>;

  get element() {
    return this._element;
  }

  get size() {
    return this._nodes.size;
  }

  constructor() {
    this._element = document.createElement("div");

    this._root = new Root<T>();
  }

  updateNode(node: ITreeNode<T>) {}

  getTreeNodeWithListIndex(location: number[]) {
    //
  }

  getTreeNode(location: number[]) {}

  getElementLocation(element: string) {
    const node = this._nodes.get(element);
  }

  getNodeLocation(node: ITreeNode<T>): number[] {
    const location: number[] = [];

    while (node.parent) {
      location.push(node.parent.children.indexOf(node));
      node = node.parent;
    }

    return location.reverse();
  }

  render() {}
}
