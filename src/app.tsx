import * as React from "react";
import "./app.scss";
import { FilterFunction, ITreeElement, TreeVisibility } from "./core/treeModel";
import { IdentityProvider } from "./core/tree";
import { IRowProps, TreeApi, TreeReact, TreeReadyEvent } from "./tree";

const Template = (props: IRowProps<Value>) => {
  const list = props.tree.list;
  const model = props.tree.model;

  const node = list.getItem(props.index);
  const isSelected = list.isSelected(props.index);

  const onClick = () => {
    model.setCollapsed(node, !node.collapsed);
  };

  const onClickRow = () => {
    list.setSelected(props.index);
  };

  if (!node) {
    return <div></div>;
  }

  return (
    <div
      onClick={onClickRow}
      style={{
        display: "flex",
        alignItems: "center",
        height: "100%",
        backgroundColor: isSelected ? "rgba(30,144,255,0.3)" : "",
        lineHeight: "25px",
      }}
    >
      <span style={{ marginLeft: `${node.depth * 16}px` }}></span>
      <span style={{ display: "flex", flexGrow: 1, height: "100%" }}>
        {node.children.length > 0 && (
          <span
            style={{ userSelect: "none", cursor: "pointer" }}
            onClick={onClick}
          >
            <a style={{ outline: "none" }} className="material-icons">
              {node.collapsed ? "chevron_right" : "expand_more"}
            </a>
          </span>
        )}
        <span>{node?.element?.value}</span>
      </span>
    </div>
  );
};

interface Value {
  value: number;
}

export const App = () => {
  const [options, setOptions] = React.useState<{
    filter: FilterFunction<Value> | undefined;
  }>({ filter: undefined });

  const [data, setData] = React.useState<ITreeElement<Value>[]>([
    { element: { value: 1 } },
    {
      element: { value: 5 },
      children: [
        {
          element: { value: 6 },
          children: [{ element: { value: 8 } }, { element: { value: 9 } }],
        },
        { element: { value: 7 } },
        { element: { value: 10 } },
      ],
    },
  ]);

  React.useEffect(() => {
    setInterval(() => {
      const random = Math.ceil(Math.random() * 10);
      const children: ITreeElement<Value>[] = [
        {
          element: { value: 6 },
          children: new Array(random).fill(0).map((_, i) => ({
            element: { value: 999 + i },
            height: Math.ceil(Math.random() * 3) * 22,
          })),
        },
        { element: { value: 7 } },
      ];

      ref.current?.setChildren(children, "5");

      // setData((_) => {
      //   const __ = [..._] as any;
      //   // __[1].children[0].children = new Array(random).fill(0).map((_, i) => ({
      //   //   element: { value: 999 + i },
      //   //   height: Math.ceil(Math.random() * 3) * 22,
      //   // }));
      //   __[1].children = children;
      //   return __;
      // });
    }, 2000);
  }, []);

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setOptions({
      filter: (element: Value) => {
        if (
          element?.value?.toString().toLowerCase().includes(event.target.value)
        ) {
          return TreeVisibility.Visible;
        }
        return TreeVisibility.Recurse;
      },
    });
  };

  const onSelectedChanged = (value: Value) => {
    console.log("selected", value);
  };

  const identityProvider: IdentityProvider<Value> = React.useMemo(
    () => ({
      getId: (element) => {
        return element.value?.toString();
      },
    }),
    []
  );

  const ref = React.useRef<TreeApi<Value>>();

  const onReady = (event: TreeReadyEvent<Value>) => {
    ref.current = event.api;
  };

  return (
    <div
      style={{
        backgroundColor: "rgb(30,30,30)",
        color: "white",
        margin: "20px",
        width: "200px",
        height: "600px",
      }}
    >
      <input style={{ width: "100%" }} type="text" onChange={onChange} />
      <TreeReact
        onReady={onReady}
        template={Template}
        onSelectionChanged={onSelectedChanged}
        data={data}
        filter={options.filter}
        identityProvider={identityProvider}
      />
    </div>
  );
};
