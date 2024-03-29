import * as React from "react";
import { ListChildComponentProps, VariableSizeList } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import { CompositeDisposable } from "./core/lifecycle";
import { IdentityProvider, ITree, Tree } from "./core/tree";
import { ITreeElement, FilterFunction, ITreeNode } from "./core/treeModel";

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
    this.rerender();
  }

  rerender() {
    this.tree.rerender();
  }
}

export interface TreeReadyEvent<T> {
  api: TreeApi<T>;
}

export interface IRowProps<T, C = any> {
  tree: Readonly<Tree<T>>;
  index: number;
  selectRow(): void;
  isSelected: boolean;
  node: Readonly<ITreeNode<T>>;
  context?: C;
}

const Row = <T, C>(props: ListChildComponentProps) => {
  const { tree, template, context } = props.data as {
    tree: Tree<T>;
    template: React.FunctionComponent<IRowProps<T, C>>;
    context?: C;
  };

  const { list, model } = tree;

  const node = list.getItem(props.index);
  const isSelected = list.isSelected(props.index);
  const selectRow = () => list.setSelected(props.index);

  const cn = React.useMemo(() => {
    const result: string[] = ["tree-node"];

    if (isSelected) {
      result.push("selected");
    }
    if (node.collapsible) {
      result.push("expandable");
      if (!node.collapsed) {
        result.push("expanded");
      }
    }
    return result.join(" ");
  }, [isSelected, node.collapsible]);

  return (
    <div
      className={cn}
      style={{ ...props.style, overflow: "hidden", boxSizing: "border-box" }}
    >
      {React.createElement(template, {
        tree,
        index: props.index,
        isSelected,
        selectRow,
        node,
        context,
      })}
    </div>
  );
};

export interface ITreeReactProps<T, C> {
  data: ITreeElement<T>[];
  template: React.FunctionComponent<IRowProps<T, C>>;
  onReady?(event: TreeReadyEvent<T>): void;
  rowHeight?: number;
  filter?: FilterFunction<T> | undefined;
  onSelectionChanged?: (element: T) => void;
  identityProvider?: IdentityProvider<T>;
  height?: number;
  width?: number;
  className?: string;
  expandByDefault?: boolean;
  context?: C;
  onListHeightChanged?: (height: number) => void;
  autoFocus?: boolean;
}

export const TreeReact = <T, C>(props: ITreeReactProps<T, C>) => {
  const [length, setLength] = React.useState<number>(0);
  const listRef = React.useRef<VariableSizeListApi>();
  const treeRef = React.useRef<ITree<T>>(
    new Tree<T>({
      identity: props.identityProvider,
      collapseByDefault:
        typeof props.expandByDefault === "boolean"
          ? !props.expandByDefault
          : true,
    })
  );

  React.useEffect(() => {
    if (!props.onListHeightChanged) {
      return;
    }
    let height = 0;
    const tree = treeRef.current;
    for (let i = 0; i < tree.list.length; i++) {
      const node = tree.list.getItem(i);
      if (typeof node.height === "number") {
        height += node.height;
      } else {
        height += DEFAULT_HEIGHT;
      }
    }
    props.onListHeightChanged(height);
  }, [length, props.onListHeightChanged]);

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
      tree.dispose();
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
      context: props.context,
    };
  }, [props.template]);

  const onKeyDown = React.useCallback((event: React.KeyboardEvent) => {
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
      default:
        return;
    }

    event.preventDefault();
  }, []);

  const hasDimensions = React.useMemo(
    () => typeof props.height === "number" && typeof props.width === "number",
    [props.height, props.width]
  );

  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (props.autoFocus) {
      ref.current?.focus();
    }
  }, []);

  return (
    <div
      ref={ref}
      className={props.className}
      style={{
        outline: "none",
        height: "100%",
        position: "relative",
        flex: "1 1 auto",
      }}
      tabIndex={0}
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
