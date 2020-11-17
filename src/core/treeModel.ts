import { IList } from "./list";
import { ITreeNode, ITreeRootNode, Root } from "./nodes";

export interface ITreeModel<T> {
  readonly size: number;
  getElementLocation(id: string): number[];
  getNodeLocation(node: ITreeNode<T>): number[];
  has(id: string): boolean;
}

export class TreeModel<T> implements ITreeModel<T> {
  private _element: HTMLElement;
  private readonly _nodes = new Map<string, ITreeNode<T>>();
  private _root: ITreeRootNode<T>;

  get element() {
    return this._element;
  }

  get size() {
    return this._nodes.size;
  }

  constructor(list: IList) {
    this._root = new Root<T>();
  }

  has(id: string) {
    return this._nodes.has(id);
  }

  updateNode(node: ITreeNode<T>) {}

  getTreeNodeWithListIndex(location: number[]) {
    //
  }

  getTreeNode(location: number[]) {}

  getElementLocation(id: string): number[] {
    const node = this._nodes.get(id);

    if (!node) {
      throw new Error(`Tree node doesn't exist ${id}`);
    }

    return this.getNodeLocation(node);
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
