import { List } from "./list";
import { ITreeNode, ITreeModel, TreeModel } from "./treeModel";

interface Template {}

class Renderer<T> {
  renderTemplate(container: HTMLElement): Template {
    return null;
  }

  render(node: ITreeNode<T>, template: Template) {}
}

class Tree<T> {
  private _list: List;
  private _model: ITreeModel<T>;

  constructor(container: HTMLElement) {
    this._list = new List(container);
    this._model = new TreeModel<T>(this._list);
  }

  has(id: string) {
    return this._model.has(id);
  }

  layout(width: number, height: number) {
    this._list.layout(width, height);
  }
}
