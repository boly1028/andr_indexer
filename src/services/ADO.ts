import { adoModel, UpdateOwnershipModel } from "../db";
import { gql } from 'graphql-request';
import { graphQLClient } from "../client";

export const createADOBulkOperation = () =>
  adoModel.collection.initializeOrderedBulkOp();

export const getADOByAddress = (address: string) => {
  return adoModel.findOne({ address });
};

export const saveNewAdo = async (ado: any) => {
  await adoModel.insertMany([ado]);
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
    { $set: { owner: data.newOwner, lastUpdatedHeight: data.txHeight, lastUpdatedHash: data.txHash } },
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

export const updateAdoAcceptOwnership = async (address: string, sender: string, txHash: string, txHeight: number) => {
  const ado = await adoModel.findOne({ address });
  if (!ado) return;

  if (!ado.acceptOwnership) {
    await adoModel.findOneAndUpdate(
      { address },
      {
        $set: {
          acceptOwnership: {
            sender: sender,
            lastUpdatedHeight: txHeight,
            lastUpdatedHash: txHash,
          }
        }
      },
      { new: true },
    );
  } else {
    if (ado.acceptOwnership.lastUpdatedHeight < txHeight) {
      await adoModel.findOneAndUpdate(
        { address },
        {
          $set: {
            acceptOwnership: {
              sender: sender,
              lastUpdatedHeight: txHeight,
              lastUpdatedHash: txHash,
            }
          }
        },
      );
    }
  }
}

export const updateAdoRevokeOwnershipOffer = async (address: string, sender: string, txHash: string, txHeight: number) => {
  const ado = await adoModel.findOne({ address });
  if (!ado) return;

  if (!ado.revokeOwnershipOffer) {
    await adoModel.findOneAndUpdate(
      { address },
      {
        $set: {
          revokeOwnershipOffer: {
            sender: sender,
            lastUpdatedHeight: txHeight,
            lastUpdatedHash: txHash,
          }
        }
      },
      { new: true },
    );
  } else {
    if (ado.revokeOwnershipOffer.lastUpdatedHeight < txHeight) {
      await adoModel.findOneAndUpdate(
        { address },
        {
          $set: {
            revokeOwnershipOffer: {
              sender: sender,
              lastUpdatedHeight: txHeight,
              lastUpdatedHash: txHash,
            }
          }
        },
      );
    }
  }
}

export const updateAdo = async (address: string, data: any) => await adoModel.findOneAndUpdate({ address }, data);
