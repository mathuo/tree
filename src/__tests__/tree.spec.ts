import { ITreeNode } from "../core/nodes";
import { TreeModel } from "../core/treeModel";
describe("tree", () => {
  test("default", () => {
    const tree = new TreeModel<number>(0, { collapseByDefault: false });

    expect(tree.root.children.length).toBe(0);

    tree.add([0], [{ element: 1 }]);

    expect(tree.root.children.length).toBe(1);

    tree.add([0], [{ element: 2, children: [{ element: 3 }, { element: 4 }] }]);

    // expect(tree.root).toMatchObject({
    //   element: 0,
    //   depth: 0,
    //   renderNodeCount: 4,
    //   visibleChildIndex: -1,
    //   children: [
    //     {
    //       element: 2,
    //       depth: 1,
    //       renderNodeCount: 3,
    //       visibleChildIndex: 0,
    //       children: [
    //         { element: 3, depth: 2, renderNodeCount: 1, visibleChildIndex: 0 },
    //         { element: 4, depth: 2, renderNodeCount: 1, visibleChildIndex: 1 },
    //       ],
    //     },
    //     { element: 1, depth: 1, renderNodeCount: 1, visibleChildIndex: 0 },
    //   ],
    // });

    expect(tree.toList2().length).toBe(4);
  });
});
