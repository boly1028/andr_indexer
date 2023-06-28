import { Log } from "@cosmjs/stargate/build/logs";
import {
  getAppInstantiationComponentInfo,
  getInstantiateInfo,
  getUpdateOwnerLogs,
} from "./ADOs";
import testData from "./TestData.json";

const appInstantiationLogs = testData.instantiation;

describe("The getAppInstantiationComponentInfo function...", () => {
  it("should skip any logs not containing a 'wasm' event", () => {
    const input: Log[] = [
      { events: [{ type: "test", attributes: [] }], msg_index: 0, log: "" },
    ];
    const expected: any = [];

    const result = getAppInstantiationComponentInfo(input, "");

    expect(expected === result);
  });

  it("should skip any events not containing a 'type' attribute", () => {
    const input: Log[] = [
      {
        events: [
          {
            type: "test",
            attributes: [
              { key: "_contract_address", value: "someaddress" },
              { key: "somekey", value: "somevalue" },
              { key: "_contract_address", value: "someaddress" },
              { key: "someotherkey", value: "somevalue" },
            ],
          },
        ],
        msg_index: 0,
        log: "",
      },
    ];
    const expected: any = [];

    const result = getAppInstantiationComponentInfo(input, "");

    expect(expected === result);
  });

  it("should skip any logs about the app", () => {
    const appAddress = "someappaddress;";
    const input: Log[] = [
      {
        events: [
          {
            type: "test",
            attributes: [
              { key: "_contract_address", value: appAddress },
              { key: "type", value: "app" },
              { key: "_contract_address", value: "someaddress" },
              { key: "someotherkey", value: "somevalue" },
            ],
          },
        ],
        msg_index: 0,
        log: "",
      },
    ];
    const expected: any = [];

    const result = getAppInstantiationComponentInfo(input, appAddress);

    expect(expected === result);
  });

  it("should skip any duplicates", () => {
    const componentAddress = "someaddress;";
    const ownerAddress = "owner";
    const adoType = "app";

    const input: Log[] = [
      {
        events: [
          {
            type: "test",
            attributes: [
              { key: "_contract_address", value: componentAddress },
              { key: "type", value: adoType },
              { key: "owner", value: ownerAddress },
              { key: "_contract_address", value: componentAddress },
              { key: "type", value: adoType },
              { key: "owner", value: ownerAddress },
            ],
          },
        ],
        msg_index: 0,
        log: "",
      },
    ];
    const expected = [
      {
        address: componentAddress,
        adoType,
        owner: ownerAddress,
      },
    ];

    const result = getAppInstantiationComponentInfo(input, "");

    expect(expected === result);
  });

  it("should correctly parse new ADOs from given transaction logs", () => {
    const appAddress =
      "juno1ncxx096kksn4m05pjc5uu8ygg5acqhx0ez0w9ygcxzg8vq46e6nq6xzrz5";
    const name = "";
    const expected = [
      {
        address:
          "juno1vace66nf96t7jjh9msd79fmqfryltkjepy25vttdzm9sqayplhqsgjnp64",
        adoType: "crowdfund",
        owner: appAddress,
        minter: '',
        name: name,
      },
      {
        address:
          "juno16xs4chh3zc93m5uuuwp2e39vhcfgwe5jaradqh58qe6u35e0unpsz00xe2",
        adoType: "cw721",
        owner: appAddress,
        minter: '',
        name: name,
      },
    ];

    const result = getAppInstantiationComponentInfo(
      appInstantiationLogs,
      appAddress
    );

    expect(expected).toEqual(result);
  });
});

describe("The getInstantiateInfo function...", () => {
  it("should ignore any logs without an ADO type attribute", () => {
    const input: Log[] = [
      {
        msg_index: 0,
        log: "",
        events: [
          {
            type: "wasm",
            attributes: [
              {
                key: "somekey",
                value: "somevlaue",
              },
            ],
          },
        ],
      },
    ];

    expect(() => getInstantiateInfo(input)).toThrow("Not an ADO Tx");
  });

  it("should ignore any logs without a '_contract_address' attribute", () => {
    const input: Log[] = [
      {
        msg_index: 0,
        log: "",
        events: [
          {
            type: "wasm",
            attributes: [
              {
                key: "type",
                value: "app",
              },
            ],
          },
        ],
      },
    ];

    expect(() => getInstantiateInfo(input)).toThrow(
      "Instantiation did not include an address"
    );
  });

  it("should ignore any logs without an owner or sender attribute", () => {
    const input: Log[] = [
      {
        msg_index: 0,
        log: "",
        events: [
          {
            type: "wasm",
            attributes: [
              {
                key: "type",
                value: "app",
              },
              {
                key: "_contract_address",
                value: "addr",
              },
            ],
          },
        ],
      },
    ];

    expect(() => getInstantiateInfo(input)).toThrow(
      "Instantiation did not include an owner"
    );
  });

  it("should return the correct info with all the correct logs (owner attribute)", () => {
    const adoType = "app";
    const owner = "owner";
    const address = "address";
    const minter = "minter";
    const name = "name";
    const input: Log[] = [
      {
        msg_index: 0,
        log: "",
        events: [
          {
            type: "wasm",
            attributes: [
              {
                key: "type",
                value: adoType,
              },
              {
                key: "owner",
                value: owner,
              },
              {
                key: "andr_app",
                value: name,
              },
              {
                key: "_contract_address",
                value: address,
              },
              {
                key: "minter",
                value: minter,
              },
            ],
          },
        ],
      },
    ];
    const expected = { address, adoType, owner, minter, name };
    const result = getInstantiateInfo(input);

    expect(result).toEqual(expected);
  });

  it("should return the correct info with all the correct logs (sender attribute)", () => {
    const adoType = "app";
    const owner = "owner";
    const address = "address";
    const minter = "minter";
    const name = "name";
    const input: Log[] = [
      {
        msg_index: 0,
        log: "",
        events: [
          {
            type: "wasm",
            attributes: [
              {
                key: "type",
                value: adoType,
              },
              {
                key: "_contract_address",
                value: address,
              },
              {
                key: "minter",
                value: minter,
              },
              {
                key: "andr_app",
                value: name,
              },
            ],
          },
          {
            type: "message",
            attributes: [
              {
                key: "sender",
                value: owner,
              },
            ],
          },
        ],
      },
    ];
    const expected = { address, adoType, owner, minter, name };
    const result = getInstantiateInfo(input);

    expect(result).toEqual(expected);
  });
});

describe("The getUpdateOwnerLogs function should...", () => {
  it("should skip any logs not containing a 'wasm' event", () => {
    const input: Log[] = [
      { events: [{ type: "test", attributes: [] }], msg_index: 0, log: "" },
    ];
    const expected: any = [];

    const result = getUpdateOwnerLogs(input);

    expect(result).toEqual(expected);
  });

  it("should skip any logs that do not contain an 'action' attribute with value 'update_owner'", () => {
    const input: Log[] = [
      { events: [{ type: "wasm", attributes: [] }], msg_index: 0, log: "" },
    ];

    const expected: any = [];

    const result = getUpdateOwnerLogs(input);

    expect(result).toEqual(expected);
  });

  it("should skip any logs that contains an 'action' attribute with value 'update_owner' but not accompanying value", () => {
    const input: Log[] = [
      {
        events: [
          {
            type: "wasm",
            attributes: [
              { key: "_contract_address", value: "somevalue" },
              { key: "action", value: "update_owner" },
              { key: "somekey", value: "somevalue" },
            ],
          },
        ],
        msg_index: 0,
        log: "",
      },
    ];

    const expected: any = [];

    const result = getUpdateOwnerLogs(input);

    expect(result).toEqual(expected);
  });

  it("should correctly parse owner updates", () => {
    const address = "someaddress";
    const newOwner = "newowner";
    const input: Log[] = [
      {
        events: [
          {
            type: "wasm",
            attributes: [
              { key: "_contract_address", value: address },
              { key: "action", value: "update_owner" },
              { key: "_contract_address", value: address },
              { key: "somekey", value: "somevalue" },
              { key: "_contract_address", value: address },
              { key: "_contract_address", value: address },
              { key: "action", value: "update_owner" },
              { key: "value", value: newOwner },
            ],
          },
        ],
        msg_index: 0,
        log: "",
      },
    ];

    const expected = [
      {
        contractAddress: address,
        newOwner,
      },
    ];

    const result = getUpdateOwnerLogs(input);

    expect(result).toEqual(expected);
  });
});
