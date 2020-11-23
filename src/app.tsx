import * as React from "react";
import "./app.scss";
import {
  FilterFunction,
  ITreeElement,
  ITreeModel,
  ITreeNode,
  TreeVisibility,
} from "./core/treeModel";
import { IdentityProvider } from "./core/tree";
import { IRowProps, TreeApi, TreeReact, TreeReadyEvent } from "./tree";

const randomNumbers = (from: number, to: number, count: number) => {
  const result = new Set<number>();

  const range = to - from + 1;

  while (result.size !== count) {
    const index = Math.floor(Math.random() * range);
    if (!result.has(index)) {
      result.add(index);
    }
  }
  return Array.from(result);
};

interface ObjectValue {
  id: string;
  text: string | number;
}

const createData = () => {
  const tickers = ["F", "AMZN", "NFLX", "GOOG", "APPL"];
  const contracts = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  const prices = 5;

  const data: ITreeElement<ObjectValue>[] = [];

  for (let i = 0; i < tickers.length; i++) {
    // const includeTicker = !!Math.floor(Math.random() * 2);
    // if (!includeTicker) {
    //   break;
    // }

    const ticker = tickers[i];

    const dataNodes: ITreeElement<ObjectValue> = {
      element: { id: ticker, text: ticker },
      children: [],
    };
    data.push(dataNodes);

    for (let i = 0; i < contracts.length; i++) {
      // const includeContract = !!Math.floor(Math.random() * 2);
      // if (!includeContract) {
      //   break;
      // }
      const contract = contracts[i];
      const contractNode: ITreeElement<ObjectValue> = {
        element: { id: `${ticker}/${contract}`, text: contract },
        children: [],
      };
      dataNodes.children?.push(contractNode);

      for (let i = 0; i < prices; i++) {
        // const includePrice = !!Math.floor(Math.random() * 2);
        // if (!includePrice) {
        //   break;
        // }
        contractNode.children?.push({
          element: {
            id: `${ticker}/${contract}/${i}`,
            text: Number(
              `${(
                Math.random() *
                100 *
                (Math.floor(Math.random() * 2) ? 1 : -1)
              ).toFixed(2)}`
            ),
          },
          height: 15,
        });
      }
    }
  }

  return data;
};

const Template = (props: IRowProps<ObjectValue>) => {
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

  const text = node?.element?.text;
  const color =
    typeof text === "number"
      ? text > 0
        ? "rgb(2, 192, 118)"
        : text < 0
        ? "rgb(248, 73, 96)"
        : ""
      : "";

  return (
    <div
      onClick={onClickRow}
      style={{
        display: "flex",
        alignItems: "center",
        height: "100%",
        backgroundColor: isSelected ? "rgba(30,144,255,0.3)" : "",
      }}
    >
      <span style={{ marginLeft: `${node.depth * 16}px` }}></span>
      <span
        style={{
          display: "flex",
          flexGrow: 1,
          height: "100%",
          alignItems: "center",
        }}
      >
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
        <span style={{ color }}>{node?.element?.text}</span>
      </span>
    </div>
  );
};

export const App = () => {
  const ref = React.useRef<TreeApi<ObjectValue>>();
  const [options, setOptions] = React.useState<{
    filter: FilterFunction<ObjectValue> | undefined;
  }>({ filter: undefined });
  const [data, setData] = React.useState<ITreeElement<ObjectValue>[]>(
    createData()
  );
  const [treeMatches, setTreeMatches] = React.useState<boolean>(true);
  const [inputValue, setInputValue] = React.useState<string>("");

  const internalSubscription = React.useRef<any>();
  const [subscription, setSubscription] = React.useState<any>();

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) =>
    setInputValue(event.target.value.toLowerCase());

  const onSelectedChanged = (value: ObjectValue) => {
    console.log("selected", value);
  };

  const onReady = (event: TreeReadyEvent<ObjectValue>) => {
    ref.current = event.api;
  };

  const identityProvider: IdentityProvider<ObjectValue> = React.useMemo(
    () => ({
      getId: (element) => {
        return element.id?.toString();
      },
    }),
    []
  );

  React.useEffect(() => {
    if (!subscription) {
      clearInterval(internalSubscription.current);
      internalSubscription.current = undefined;
      return;
    }
    internalSubscription.current = setInterval(() => {
      ref.current?.setChildren(createData());
    }, 1000);
  }, [subscription]);

  React.useEffect(() => {
    setOptions({
      filter: (element: ObjectValue) => {
        if (element?.text?.toString().toLowerCase().includes(inputValue)) {
          // return TreeVisibility.Visible;
          return treeMatches ? TreeVisibility.Tree : TreeVisibility.Visible;
        }
        return TreeVisibility.Recurse;
      },
    });
  }, [treeMatches, inputValue]);

  const toggleKeyboard = (f: (_: (g: boolean) => boolean) => void) => (
    ev: React.KeyboardEvent
  ) => ev.key === "Enter" && f((_) => !_);

  const toggle = (f: (_: (g: boolean) => boolean) => void) => () =>
    f((_) => !_);

  return (
    <div className="container">
      <div className="tree-container">
        <div className="settings-container">
          <div>
            <span>Tree matches</span>
            <input
              type="checkbox"
              checked={treeMatches}
              onChange={toggle(setTreeMatches)}
              onKeyDown={toggleKeyboard(setTreeMatches)}
            />
          </div>

          <div>
            <span>Stream data</span>
            <input
              type="checkbox"
              checked={subscription}
              onChange={toggle(setSubscription)}
              onKeyDown={toggleKeyboard(setSubscription)}
            />
          </div>
          <input
            value={inputValue}
            style={{ width: "100%" }}
            type="text"
            onChange={onChange}
            placeholder="Search"
          />
        </div>
        <TreeReact
          className={"demo-tree"}
          onReady={onReady}
          template={Template}
          onSelectionChanged={onSelectedChanged}
          data={data}
          filter={options.filter}
          identityProvider={identityProvider}
        />
      </div>
    </div>
  );
};
