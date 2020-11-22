import * as React from "react";
import "./app.scss";
import { ListChildComponentProps, VariableSizeList } from "react-window";
import { CompositeDisposable } from "./core/lifecycle";
import { IdentityProvider, ITree, Tree } from "./core/tree";
import { ITreeElement, FilterFunction, ITreeNode } from "./core/treeModel";

import AutoSizer from "react-virtualized-auto-sizer";

const DEFAULT_HEIGHT = 22;

interface VariableSizeListApi
  extends Pick<
    VariableSizeList,
    "scrollTo" | "scrollToItem" | "resetAfterIndex"
  > {}

export class TreeApi<T> {
  constructor(private readonly tree: ITree<T>) {}

  setChildren(children: ITreeElement<T>[], id?: string): void {
    let node: ITreeNode<T> | undefined;

    if (typeof id === "string") {
      node = this.tree.getNodeByIdentity(id);
    }

    this.tree.setChildren(children, node?.element);
    this.tree.rerender();
  }
}

export interface TreeReadyEvent<T> {
  api: TreeApi<T>;
}

export interface IRowProps<T> {
  tree: Readonly<Tree<T>>;
  index: number;
}

const Row = <T,>(props: ListChildComponentProps) => {
  const { tree, template } = props.data as {
    tree: Tree<T>;
    template: React.FunctionComponent<IRowProps<T>>;
  };

  return (
    <div style={{ ...props.style, overflow: "hidden" }}>
      {React.createElement(template, { tree, index: props.index })}
    </div>
  );
};

export interface ITreeReactProps<T> {
  data: ITreeElement<T>[];
  template: React.FunctionComponent<IRowProps<T>>;
  onReady?(event: TreeReadyEvent<T>): void;
  rowHeight?: number;
  filter?: FilterFunction<T> | undefined;
  onSelectionChanged?: (element: T) => void;
  identityProvider?: IdentityProvider<T>;
  height?: number;
  width?: number;
}

export const TreeReact = <T,>(props: ITreeReactProps<T>) => {
  const [length, setLength] = React.useState<number>(0);
  const listRef = React.useRef<VariableSizeListApi>();
  const treeRef = React.useRef<ITree<T>>(
    new Tree<T>({ identity: props.identityProvider })
  );

  React.useEffect(() => {
    const tree = treeRef.current;

    const disposable = new CompositeDisposable(
      tree.list.onSelectionChanged(() => {
        const index = tree.list.selectedIndex;

        if (index > -1 && index < tree.list.length) {
          listRef.current?.resetAfterIndex(index);
          listRef.current?.scrollToItem(index, "smart");

          if (props.onSelectionChanged) {
            const node = tree.list.getItem(index);
            props.onSelectionChanged(node.element);
          }
        }
      })
    );

    return () => {
      disposable.dispose();
    };
  }, [props.onSelectionChanged]);

  React.useEffect(() => {
    const tree = treeRef.current;

    const disposable = new CompositeDisposable(
      tree.list.onSplice((index) => {
        setLength(tree.list.length);
        listRef.current?.resetAfterIndex(index);
        treeRef.current.list.setSelected(
          Math.max(0, Math.min(tree.list.length - 1, tree.list.selectedIndex))
        );
      })
    );

    if (props.onReady) {
      props.onReady({ api: new TreeApi(tree) });
    }

    return () => {
      disposable.dispose();
    };
  }, []);

  React.useEffect(() => {
    treeRef.current.model.filter = props.filter;
  }, [props.filter]);

  React.useEffect(() => {
    treeRef.current.setChildren(props.data);
    treeRef.current.rerender();
  }, [props.data]);

  const getItemSize = React.useCallback(
    (index: number) => {
      const node = treeRef.current.list.getItem(index);
      if (typeof node.height === "number") {
        return node.height;
      }
      if (typeof props.rowHeight === "number") {
        return props.rowHeight;
      }
      return DEFAULT_HEIGHT;
    },
    [props.rowHeight]
  );

  const itemData = React.useMemo(() => {
    return {
      tree: treeRef.current,
      template: props.template,
    };
  }, [props.template]);

  const onKeyDown = React.useCallback((event: React.KeyboardEvent) => {
    event.preventDefault();
    const model = treeRef.current.model;
    const list = treeRef.current.list;
    switch (event.key) {
      case "ArrowRight": {
        const node = list.getItem(list.selectedIndex);
        model.setCollapsed(node, false);
        break;
      }
      case "ArrowLeft":
        {
          const node = list.getItem(list.selectedIndex);
          if (!model.setCollapsed(node, true)) {
            const location = model.getNodeLocation(node);
            if (location.length > 1) {
              location.splice(location.length - 1, 1);
              const { listIndex } = model.getTreeNodeWithListIndex(location);
              list.setSelected(listIndex);
            }
          }
        }
        break;
      case "ArrowUp":
        list.setSelected(Math.max(0, list.selectedIndex - 1));
        break;
      case "ArrowDown":
        list.setSelected(Math.min(list.length - 1, list.selectedIndex + 1));
        break;
      case "Enter": {
        const node = list.getItem(list.selectedIndex);
        model.setCollapsed(node, !node.collapsed);
        break;
      }
    }
  }, []);

  const hasDimensions = React.useMemo(
    () => typeof props.height === "number" && typeof props.width === "number",
    [props.height, props.width]
  );

  return (
    <div
      style={{ outline: "none", height: "100%" }}
      tabIndex={-1}
      onKeyDown={onKeyDown}
    >
      {!hasDimensions ? (
        <AutoSizer>
          {({ width, height }) => (
            <VariableSizeList
              ref={listRef as React.MutableRefObject<VariableSizeList>}
              height={height}
              width={width}
              itemCount={length}
              estimatedItemSize={props.rowHeight || DEFAULT_HEIGHT}
              itemSize={getItemSize}
              itemData={itemData}
            >
              {Row}
            </VariableSizeList>
          )}
        </AutoSizer>
      ) : (
        <VariableSizeList
          ref={listRef as React.MutableRefObject<VariableSizeList>}
          height={props.height as number}
          width={props.width as number}
          itemCount={length}
          estimatedItemSize={props.rowHeight || DEFAULT_HEIGHT}
          itemSize={getItemSize}
          itemData={itemData}
        >
          {Row}
        </VariableSizeList>
      )}
    </div>
  );
};
