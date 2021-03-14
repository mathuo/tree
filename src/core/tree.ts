import { CompositeDisposable, IDisposable } from "./lifecycle";
import { IList, List } from "./list";
import { ITreeNode } from "./treeModel";
import { ITreeModel, TreeModel, ITreeElement } from "./treeModel";

export interface ITree<T> extends IDisposable {
  readonly size: number;
  readonly list: IList<ITreeNode<T>>;
  readonly model: ITreeModel<T>;
  splice(
    location: number[],
    deleteCount: number,
    toInsert: ITreeNode<T>[]
  ): ITreeNode<T>[];
  setChildren(children: ITreeElement<T>[], element?: T): void;
  rerender(): void;
  getNodeByElement(element: T): ITreeNode<T>;
  getNodeByIdentity(id: string): ITreeNode<T>;
}

export interface IdentityProvider<T> {
  getId: (element: T) => string;
}

export class Tree<T extends Exclude<any, undefined>> implements ITree<T> {
  private _disposable: IDisposable;
  private _list: List<ITreeNode<T>>;
  private _model: ITreeModel<T | null>;
  private _nodes = new Map<T | null, ITreeNode<T>>();
  private readonly nodesByIdentity = new Map<string, ITreeNode<T>>();
  private readonly identityProvider?: IdentityProvider<T>;

  get model() {
    return this._model as ITreeModel<T>;
  }

  get list() {
    return this._list;
  }

  get size() {
    return this._nodes.size;
  }

  getNodeByElement(element: T) {
    return this._nodes.get(element) as ITreeNode<T>;
  }

  getNodeByIdentity(id: string) {
    if (!this.identityProvider) {
      throw new Error(
        "You must provide an identityProvider to use getNodeByIdentity(...)"
      );
    }
    return this.nodesByIdentity.get(id) as ITreeNode<T>;
  }

  constructor(options: {
    identity?: IdentityProvider<T>;
    collapseByDefault: boolean;
  }) {
    this.identityProvider = options?.identity;
    this._list = new List();
    this._model = new TreeModel(this._list, null, {
      collapseByDefault: options.collapseByDefault,
      autoExpandSingleChildren: true,
    });

    this._disposable = new CompositeDisposable(
      this._model.onDidFilterChange(() => {
        this.rerender();
      })
    );
  }

  dispose() {
    this._disposable.dispose();
    this._model.dispose();
    this._list.dispose();
  }

  rerender() {
    const list = this.model.asList();
    this.list.splice(0, this.list.length, ...list);
  }

  splice(
    location: number[],
    deleteCount: number,
    toInsert: ITreeElement<T>[]
  ): ITreeNode<T>[] {
    const insertedElements = new Set<T | null>();
    const insertedElementIds = new Set<string>();

    const _onDidCreateNode = (node: ITreeNode<T | null>) => {
      if (node.element === null) {
        return;
      }

      if (this.identityProvider) {
        const id = this.identityProvider.getId(node.element).toString();
        insertedElementIds.add(id);
        this.nodesByIdentity.set(id, node as ITreeNode<T>);
      }

      insertedElements.add(node.element);
      this._nodes.set(node.element, node as ITreeNode<T>);
    };

    const _onDidDeleteNode = (node: ITreeNode<T | null>) => {
      if (node.element === null) {
        return;
      }

      if (!insertedElements.has(node.element)) {
        this._nodes.delete(node.element);
      }

      if (this.identityProvider) {
        const id = this.identityProvider.getId(node.element).toString();
        if (!insertedElementIds.has(id)) {
          this.nodesByIdentity.delete(id);
        }
      }
    };

    return this._model.splice(
      [...location, 0],
      deleteCount,
      toInsert,
      _onDidCreateNode,
      _onDidDeleteNode
    ) as ITreeNode<T>[];
  }

  setChildren(children: ITreeElement<T>[], element: T): void {
    const location =
      element === undefined ? [] : this.getElementLocation(element);
    this._setChildren(location, this.preserveCollapseState(children));
  }

  private preserveCollapseState(
    elements: ITreeElement<T>[] | undefined
  ): ITreeElement<T>[] {
    if (elements === undefined) {
      return [];
    }
    return elements.map((treeElement) => {
      let node = this._nodes.get(treeElement.element);

      if (!node && this.identityProvider) {
        const id = this.identityProvider.getId(treeElement.element).toString();
        node = this.nodesByIdentity.get(id);
      }

      if (!node) {
        return {
          ...treeElement,
          children: this.preserveCollapseState(treeElement.children),
        };
      }

      const collapsible =
        typeof treeElement.collapsible === "boolean"
          ? treeElement.collapsible
          : node.collapsible;
      const collapsed =
        typeof treeElement.collapsed !== "undefined"
          ? treeElement.collapsed
          : node.collapsed;

      return {
        ...treeElement,
        collapsible,
        collapsed,
        children: this.preserveCollapseState(treeElement.children),
      };
    });
  }

  private _setChildren(location: number[], children: ITreeElement<T>[]): void {
    const insertedElements = new Set<T | null>();
    const insertedElementIds = new Set<string>();

    const _onDidCreateNode = (node: ITreeNode<T | null>) => {
      if (node.element === null) {
        return;
      }

      if (this.identityProvider) {
        const id = this.identityProvider.getId(node.element).toString();
        insertedElementIds.add(id);
        this.nodesByIdentity.set(id, node as ITreeNode<T>);
      }

      insertedElements.add(node.element);
      this._nodes.set(node.element, node as ITreeNode<T>);
    };

    const _onDidDeleteNode = (node: ITreeNode<T | null>) => {
      if (node.element === null) {
        return;
      }

      if (!insertedElements.has(node.element)) {
        this._nodes.delete(node.element);
      }

      if (this.identityProvider) {
        const id = this.identityProvider.getId(node.element).toString();
        if (!insertedElementIds.has(id)) {
          this.nodesByIdentity.delete(id);
        }
      }
    };

    this._model.splice(
      [...location, 0],
      Number.MAX_VALUE,
      children,
      _onDidCreateNode,
      _onDidDeleteNode
    );
  }

  private getElementLocation(element: T): number[] {
    if (element === null) {
      return [];
    }

    let node = this._nodes.get(element);

    if (!node && this.identityProvider) {
      node = this.nodesByIdentity.get(this.identityProvider.getId(element));
    }

    if (!node) {
      throw new Error(`Tree element not found: ${element}`);
    }

    return this._model.getNodeLocation(node);
  }
}
