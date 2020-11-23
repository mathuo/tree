import { Emitter, Event } from "./event";
import { IDisposable } from "./lifecycle";
import { IList } from "./list";

export enum TreeVisibility {
  /**  Hide the node */
  Hidden,
  /** Show the node if any children are visible */
  Recurse,
  /** Show the node */
  Visible,
  /** Show the node and all of it's children */
  Tree,
}

export interface ITreeNode<T> {
  collapsible: boolean;
  collapsed: boolean;
  visible: boolean;
  parent: ITreeNode<T> | undefined;
  children: ITreeNode<T>[];
  element: T;
  depth: number;
  visibleChildrenCount: number;
  visibleChildIndex: number;
  renderNodeCount: number;
  height?: number;
}

export interface ITreeModel<T> extends IDisposable {
  readonly onDidFilterChange: Event<void>;
  getNodeLocation(node: ITreeNode<T>): number[];
  splice(
    location: number[],
    deleteCount: number,
    toInsert: ITreeElement<T>[],
    onDidCreateNode?: (node: ITreeNode<T>) => void,
    onDidDeleteNode?: (node: ITreeNode<T>) => void
  ): ITreeNode<T>[];
  filter: FilterFunction<T> | undefined;
  setCollapsed(node: ITreeNode<T>, isCollapsed: boolean): boolean;
  getTreeNodeWithListIndex(
    location: number[]
  ): { node: ITreeNode<T>; listIndex: number; visible: boolean };
  asList(): ITreeNode<T>[];
}

export interface ITreeElement<T> {
  element: T;
  children?: ITreeElement<T>[];
  collapsed?: boolean;
  collapsible?: boolean;
  height?: number;
}

interface TreeModelOptions {
  readonly collapseByDefault: boolean;
  readonly autoExpandSingleChildren: boolean;
}

export type FilterFunction<T> = (node: T) => TreeVisibility;

export class TreeModel<T extends Exclude<any, undefined>>
  implements ITreeModel<T> {
  private readonly _root: ITreeNode<T>;
  private _filter: FilterFunction<T> | undefined = undefined;

  private readonly _onDidFilterChange = new Emitter<void>();
  onDidFilterChange = this._onDidFilterChange.event;

  get filter() {
    return this._filter;
  }

  set filter(value: FilterFunction<T> | undefined) {
    this._filter = value;
    this._onDidFilterChange.fire();
  }

  get root() {
    return this._root;
  }

  constructor(
    private list: IList<ITreeNode<T>>,
    rootElement: T,
    private options: TreeModelOptions
  ) {
    this._root = {
      parent: undefined,
      element: rootElement,
      children: [],
      depth: 0,
      visibleChildrenCount: 0,
      visibleChildIndex: -1,
      collapsible: false,
      collapsed: false,
      renderNodeCount: 0,
      visible: true,
    };
  }

  dispose() {
    this._onDidFilterChange.dispose();
  }

  splice(
    location: number[],
    deleteCount: number,
    toInsert: ITreeElement<T>[],
    onDidCreateNode?: (node: ITreeNode<T>) => void,
    onDidDeleteNode?: (node: ITreeNode<T>) => void
  ): ITreeNode<T>[] {
    if (location.length === 0) {
      throw new Error("Invalid tree location");
    }

    const { parentNode } = this.getParentNodeWithListIndex(location);

    const listNodes: ITreeNode<T>[] = [];
    const nodesToInsert = toInsert.map((el) =>
      this.createTreeNode(
        el,
        parentNode,
        parentNode.visible ? TreeVisibility.Visible : TreeVisibility.Hidden,
        listNodes,
        onDidCreateNode
      )
    );

    const lastIndex = location[location.length - 1];

    let visibleChildStartIndex = 0;

    for (let i = lastIndex; i >= 0 && i < parentNode.children.length; i--) {
      const child = parentNode.children[i];

      if (child.visible) {
        visibleChildStartIndex = child.visibleChildIndex;
        break;
      }
    }

    let insertedVisibleChildrenCount = 0;
    let renderNodeCount = 0;

    nodesToInsert.forEach((child) => {
      renderNodeCount += child.renderNodeCount;
      if (child.visible) {
        child.visibleChildIndex =
          visibleChildStartIndex + insertedVisibleChildrenCount++;
      }
    });

    const deletedNodes = parentNode.children.splice(
      lastIndex,
      deleteCount,
      ...nodesToInsert
    );

    let deletedVisibleChildrenCount = 0;

    for (const child of deletedNodes) {
      if (child.visible) {
        deletedVisibleChildrenCount++;
      }
    }

    // and adjust for all visible children after the splice point
    if (deletedVisibleChildrenCount !== 0) {
      for (
        let i = lastIndex + nodesToInsert.length;
        i < parentNode.children.length;
        i++
      ) {
        const child = parentNode.children[i];

        if (child.visible) {
          child.visibleChildIndex -= deletedVisibleChildrenCount;
        }
      }
    }

    parentNode.visibleChildrenCount += insertedVisibleChildrenCount;

    if (deletedNodes.length > 0 && onDidDeleteNode) {
      const visit = (node: ITreeNode<T>) => {
        onDidDeleteNode(node);
        node.children.forEach(visit);
      };

      deletedNodes.forEach(visit);
    }

    this._updateAncestorsRenderCount(parentNode, renderNodeCount);

    return deletedNodes;
  }

  asList() {
    const result: ITreeNode<T>[] = [];
    this.toList(
      this.root,
      this.root.visibleChildrenCount
        ? TreeVisibility.Visible
        : TreeVisibility.Hidden,
      result
    );

    return result;
  }

  setCollapsed(node: ITreeNode<T>, isCollapsed: boolean) {
    const location = this.getNodeLocation(node);
    const { node: _node, listIndex } = this.getTreeNodeWithListIndex(location);
    const result = this._setListNodeCollapseState(
      _node,
      listIndex,
      isCollapsed
    );

    // autoExpandSingleChildren

    return result;
  }

  getNodeLocation(node: ITreeNode<T>): number[] {
    const location: number[] = [];

    while (node.parent) {
      location.push(node.parent.children.indexOf(node));
      node = node.parent;
    }

    return location.reverse();
  }

  getTreeNodeWithListIndex(location: number[]) {
    if (location.length === 0) {
      return { node: this.root, listIndex: -1, revealed: true, visible: false };
    }

    const { parentNode, listIndex, visible } = this.getParentNodeWithListIndex(
      location
    );
    const index = location[location.length - 1];

    if (index < 0 || index > parentNode.children.length) {
      throw new Error("Invalid tree location");
    }

    const node = parentNode.children[index];

    return { node, listIndex, visible: visible && node.visible };
  }

  private _setListNodeCollapseState(
    node: ITreeNode<T>,
    listIndex: number,
    isCollapsed: boolean
  ) {
    const result = this._setNodeCollapseState(node, isCollapsed);

    if (!node.visible || !result) {
      return result;
    }

    const previousRenderNodeCount = node.renderNodeCount;
    const toInsert = this.updateNodeAfterCollapseChange(node);
    const deleteCount = previousRenderNodeCount - (listIndex === -1 ? 0 : 1);
    this.list.splice(listIndex + 1, deleteCount, ...toInsert.slice(1));

    return result;
  }

  private _setNodeCollapseState(node: ITreeNode<T>, isCollapsed: boolean) {
    let result: boolean;

    if (node === this.root) {
      result = false;
    } else {
      if (!node.collapsible) {
        result = false;
      } else {
        result = node.collapsed !== isCollapsed;
        node.collapsed = isCollapsed;
      }

      if (result) {
        // this._onDidChangeCollapseState.fire({ node, deep });
      }
    }

    return result;
  }

  private updateNodeAfterCollapseChange(node: ITreeNode<T>): ITreeNode<T>[] {
    const previousRenderNodeCount = node.renderNodeCount;
    const result: ITreeNode<T>[] = [];

    this._updateNodeAfterCollapseChange(node, result);
    this._updateAncestorsRenderNodeCount(
      node.parent,
      result.length - previousRenderNodeCount
    );

    return result;
  }

  private _updateAncestorsRenderNodeCount(
    node: ITreeNode<T> | undefined,
    diff: number
  ): void {
    if (diff === 0) {
      return;
    }

    while (node) {
      node.renderNodeCount += diff;
      // this._onDidChangeRenderNodeCount.fire(node);
      node = node.parent;
    }
  }

  private _updateNodeAfterCollapseChange(
    node: ITreeNode<T>,
    result: ITreeNode<T>[]
  ): number {
    if (node.visible === false) {
      return 0;
    }

    result.push(node);
    node.renderNodeCount = 1;

    if (!node.collapsed) {
      for (const child of node.children) {
        node.renderNodeCount += this._updateNodeAfterCollapseChange(
          child,
          result
        );
      }
    }

    // this._onDidChangeRenderNodeCount.fire(node);
    return node.renderNodeCount;
  }

  private _filterNode(node: ITreeNode<T>, parentVisibility: TreeVisibility) {
    let visible: TreeVisibility;

    if (parentVisibility === TreeVisibility.Tree) {
      return TreeVisibility.Tree;
    }

    if (this.filter) {
      visible = this.filter(node.element);
      return visible;
    }

    if (node.visible) {
      return TreeVisibility.Visible;
    }
    return TreeVisibility.Hidden;
  }

  private toList(
    node: ITreeNode<T>,
    parentVisibility: TreeVisibility,
    result: ITreeNode<T>[],
    revealed: boolean = true
  ): boolean {
    let visibility: TreeVisibility = parentVisibility;

    if (node !== this.root) {
      visibility = this._filterNode(node, parentVisibility);

      if (visibility === TreeVisibility.Hidden) {
        node.visible = false;
        node.renderNodeCount = 0;
        return false;
      }

      if (revealed) {
        result.push(node);
      }
    }

    const resultStartLength = result.length;
    node.renderNodeCount = node === this.root ? 0 : 1;

    let hasVisibleDescendants = false;
    if (!node.collapsed || visibility !== TreeVisibility.Hidden) {
      let visibleChildIndex = 0;

      for (const child of node.children) {
        hasVisibleDescendants =
          this.toList(child, visibility, result, revealed && !node.collapsed) ||
          hasVisibleDescendants;

        if (child.visible) {
          child.visibleChildIndex = visibleChildIndex++;
        }
      }

      node.visibleChildrenCount = visibleChildIndex;
    } else {
      node.visibleChildrenCount = 0;
    }

    if (node !== this.root) {
      // if (hasVisibleDescendants) {
      //   node.collapsed = false;
      // }
      node.visible =
        visibility === TreeVisibility.Recurse
          ? hasVisibleDescendants
          : visibility! === TreeVisibility.Visible ||
            visibility === TreeVisibility.Tree;
    }

    if (!node.visible) {
      node.renderNodeCount = 0;

      if (revealed) {
        result.pop();
      }
    } else if (!node.collapsed) {
      node.renderNodeCount += result.length - resultStartLength;
    }

    // this._onDidChangeRenderNodeCount.fire(node);
    return node.visible;
  }

  private _updateAncestorsRenderCount(node: ITreeNode<T>, diff: number) {
    if (diff === 0) {
      return;
    }

    let _node: ITreeNode<T> | undefined = node;

    while (_node) {
      _node.renderNodeCount += diff;
      // this._onDidChangeRenderNodeCount.fire(node);
      _node = _node.parent;
    }
  }

  private createTreeNode(
    treeElement: ITreeElement<T>,
    parent: ITreeNode<T>,
    parentVisibility: TreeVisibility,
    treeListElements: ITreeNode<T>[],
    onDidCreateNode?: (node: ITreeNode<T>) => void
  ): ITreeNode<T> {
    const node: ITreeNode<T> = {
      parent,
      element: treeElement.element,
      children: [],
      depth: parent.depth + 1,
      visibleChildrenCount: 0,
      visibleChildIndex: -1,
      collapsible:
        typeof treeElement.collapsible === "boolean"
          ? treeElement.collapsible
          : typeof treeElement.collapsed !== "undefined",

      collapsed:
        typeof treeElement.collapsed === "undefined"
          ? this.options.collapseByDefault
          : treeElement.collapsed,
      renderNodeCount: 1,
      visible: true,
      height: treeElement.height,
    };

    const childElements = treeElement.children || [];
    const childNodes = childElements.map((el) =>
      this.createTreeNode(
        el,
        node,
        parentVisibility,
        treeListElements,
        onDidCreateNode
      )
    );

    let visibleChildrenCount = 0;
    let renderNodeCount = 1;

    childNodes.forEach((child) => {
      node.children.push(child);
      renderNodeCount += child.renderNodeCount;

      if (child.visible) {
        child.visibleChildIndex = visibleChildrenCount++;
      }
    });

    node.collapsible = node.collapsible || node.children.length > 0;
    node.visibleChildrenCount = visibleChildrenCount;
    // node.visible =
    //   visibility === TreeVisibility.Recurse
    //     ? visibleChildrenCount > 0
    //     : visibility === TreeVisibility.Visible;

    if (!node.visible) {
      node.renderNodeCount = 0;

      // if (revealed) {
      //   treeListElements.pop();
      // }
    } else if (!node.collapsed) {
      node.renderNodeCount = renderNodeCount;
    }

    if (onDidCreateNode) {
      onDidCreateNode(node);
    }

    return node;
  }

  private getParentNodeWithListIndex(
    location: number[],
    node: ITreeNode<T> = this._root,
    listIndex: number = 0,
    visible = true
  ): {
    parentNode: ITreeNode<T>;
    listIndex: number;
    visible: boolean;
  } {
    const [index, ...rest] = location;

    if (index < 0 || index > node.children.length) {
      throw new Error("Invalid tree location");
    }

    for (let i = 0; i < index; i++) {
      listIndex += node.children[i].renderNodeCount;
    }

    visible = visible && node.visible;

    if (rest.length === 0) {
      return { parentNode: node, listIndex, visible };
    }

    return this.getParentNodeWithListIndex(
      rest,
      node.children[index],
      listIndex + 1,
      visible
    );
  }
}
