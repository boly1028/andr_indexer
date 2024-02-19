import { adoModel } from "../db";
import { gql } from 'graphql-request';
import { graphQLClient } from "../client";

export const createADOBulkOperation = () =>
  adoModel.collection.initializeOrderedBulkOp();

export const getADOByAddress = (address: string) => {
  return adoModel.findOne({ address });
};

export const saveNewAdo = async (ado: any) => {
  await adoModel.insertMany([ado]);
  console.log(ado);
  const mutation = gql`
  mutation ADD_ADO($address: String!, $adoType: String!, $appContract: String, $chainId: String!, $instantiateHash: String!, $instantiateHeight: Int!, $lastUpdatedHash: String!, $lastUpdatedHeight: Int!, $minter: String, $name: String, $owner: String!) {
    addAdo(input: { address: $address, adoType: $adoType, appContract: $appContract, chainId: $chainId, instantiateHash: $instantiateHash, instantiateHeight: $instantiateHeight, lastUpdatedHash: $lastUpdatedHash, lastUpdatedHeight: $lastUpdatedHeight, minter: $minter, name: $name, owner: $owner}) {
      address
    }
  }`;

  const variables = {
    address: ado.address,
    adoType: ado.adoType,
    appContract: ado.appContract,
    chainId: ado.chainId,
    instantiateHash: ado.instantiateHash,
    instantiateHeight: ado.instantiateHeight,
    lastUpdatedHash: ado.lastUpdatedHash,
    lastUpdatedHeight: ado.lastUpdatedHeight,
    name:ado.name,
    minter: ado.minter,
    owner: ado.owner
  };

  return await graphQLClient.request(mutation, variables);
}

export const updateAdoOwner = async (data: any) => {
  const ado = await adoModel.findOneAndUpdate(
    {
      $and: [{ address: data.address }, { lastUpdatedHeight: { $lt: data.txHeight } }],
    },
    { $set: { owner: data.newOwner, lastUpdatedHeight: data.txHeight } },
    { new: true },
  );
  if (!ado) {
    return;
  }

  const mutation = gql`
  mutation UPDATE_ADO_OWNER($address: String!, $newOwner: String!, $txHeight: Int!) {
    updateAdoOwner(input: { address: $address, newOwner: $newOwner, txHeight: $txHeight}) {
      address
    }
  }`;

  const variables = {
    address: data.address,
    newOwner: data.newOwner,
    txHeight: data.txHeight
  };

  return await graphQLClient.request(mutation, variables);
}

export const updateAdo = async (address: string, data: any) => await adoModel.findOneAndUpdate({ address }, data);
