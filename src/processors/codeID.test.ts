import { Log } from "@cosmjs/stargate/build/logs";
import { getCodeIDInfo } from "./codeID";
import testData from "./TestData.json";

const updateCodeIdLogs = testData.updateCodeId;

describe("The getAppInstantiationComponentInfo function...", () => {
  it("should skip any logs not containing a 'wasm' event", () => {
    const input: Log[] = [
      { events: [{ type: "test", attributes: [] }], msg_index: 0, log: "" },
    ];

    const result = getCodeIDInfo(input);

    expect(result).toBeUndefined();
  });

  it("should skip any logs not containing a 'wasm.code_id_key' event", () => {
    const input: Log[] = [
      {
        events: [
          { type: "test", attributes: [] },
          { type: "wasm", attributes: [{ key: "code_id", value: "1" }] },
        ],
        msg_index: 0,
        log: "",
      },
    ];

    const result = getCodeIDInfo(input);

    expect(result).toBeUndefined();
  });

  it("should skip any logs not containing a 'wasm.code_id' event", () => {
    const input: Log[] = [
      {
        events: [
          { type: "test", attributes: [] },
          {
            type: "wasm",
            attributes: [{ key: "code_id_key", value: "cw721" }],
          },
        ],
        msg_index: 0,
        log: "",
      },
    ];

    const result = getCodeIDInfo(input);

    expect(result).toBeUndefined();
  });

  it("should skip any logs not containing a valid 'wasm.code_id' event", () => {
    const input: Log[] = [
      {
        events: [
          { type: "test", attributes: [] },
          {
            type: "wasm",
            attributes: [
              { key: "code_id_key", value: "abc" },
              { key: "code_id", value: "abc" },
            ],
          },
        ],
        msg_index: 0,
        log: "",
      },
    ];

    const result = getCodeIDInfo(input);

    expect(result).toBeUndefined();
  });

  it("should return the correct code ID and key from a valid log", () => {
    const input = updateCodeIdLogs[0].rawLog;

    const result = getCodeIDInfo(input);
    const expected = { codeId: 3647, adoType: "cw721" };
    expect(result).toEqual(expected);
  });
});
