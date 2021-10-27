/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * Generated with the TypeScript template
 * https://github.com/react-native-community/react-native-template-typescript
 *
 * @format
 */
import React, {useEffect, useState} from 'react';
import {
  Button,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import lnd, {
  ENetworks,
  ICachedNeutrinoDBDownloadState,
  LndConf,
  ss_lnrpc,
  lnrpc,
} from '@synonymdev/react-native-lightning';

import lndCache from '@synonymdev/react-native-lightning/dist/utils/neutrino-cache';

import PSBT from './src/PSBT';
import Options from './src/Options';
import {Result} from '../dist/utils/result';

declare const global: {HermesInternal: null | {}};

const dummyPassword = 'shhhhhhh123';

const testNodePubkey =
  '024e9d7a7e3d2c414819a37003568a71bdc96f5a252dde10cb3a351646e195e98b';
const testNodeAddress = '192.168.1.139:9735';

const network = ENetworks.regtest;

const App = () => {
  const [message, setMessage] = useState('');
  const [lndState, setLndState] = useState<ss_lnrpc.WalletState>(
    ss_lnrpc.WalletState.WAITING_TO_START,
  );

  const [seed, setSeed] = useState<string[]>([]);

  const startStateSubscription = () => {
    lnd.stateService.subscribeToStateChanges(
      (res: Result<ss_lnrpc.WalletState>) => {
        if (res.isOk()) {
          setLndState(res.value);
        }
      },
      () => {},
    );
  };

  useEffect(() => {
    (async () => {
      const res = await lnd.stateService.getState();
      if (res.isOk()) {
        setLndState(res.value);
        if (res.value !== ss_lnrpc.WalletState.WAITING_TO_START) {
          startStateSubscription();
        }
      }
    })();
  }, []);

  useEffect(() => {
    if (lndState === ss_lnrpc.WalletState.RPC_ACTIVE) {
      lnd.subscribeToOnChainTransactions(
        (res: Result<lnrpc.Transaction>) => {
          if (res.isErr()) {
            return console.error(res.error);
          }

          const {amount, numConfirmations} = res.value;
          if (amount < 0) {
            return;
          }
          setMessage(`On chain tx: ${amount} sats (${numConfirmations} confs)`);
        },
        () => {},
      );

      lnd.subscribeToBackups(
        (res: Result<lnrpc.ChanBackupSnapshot>) => {
          if (res.isErr()) {
            return console.error(res.error);
          }

          const backupBytes = res.value.multiChanBackup?.multiChanBackup;
          console.log(`Backup required (${backupBytes?.length} bytes)`);
        },
        () => {},
      );
    }
  }, [lndState]);

  const startLnd = async (customFields: any): Promise<void> => {
    setMessage('Starting LND...');
    const lndConf = new LndConf(network, customFields);
    const res = await lnd.start(lndConf);

    if (res.isErr()) {
      setMessage(res.error.message);
      console.error(res.error);
      return;
    }

    startStateSubscription();
    setMessage(JSON.stringify(res.value));
  };

  const showStartButton = lndState === ss_lnrpc.WalletState.WAITING_TO_START;
  const showUnlockButton = lndState === ss_lnrpc.WalletState.LOCKED;
  const showGenerateSeed = lndState === ss_lnrpc.WalletState.NON_EXISTING;
  const showCreateButton =
    seed.length > 0 && lndState === ss_lnrpc.WalletState.NON_EXISTING;
  const showRpcOptions = lndState === ss_lnrpc.WalletState.RPC_ACTIVE;

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={styles.scrollView}>
          <Text style={styles.state}>
            State: {lnd.stateService.readableState(lndState)}
          </Text>

          <Text style={styles.message}>{message}</Text>

          {showStartButton ? (
            <>
              <Button
                title={'Download cached headers then start LND'}
                onPress={async () => {
                  setMessage('Downloading cached headers...');
                  setMessage(JSON.stringify(lndCache));
                  lndCache.addStateListener(
                    (state: ICachedNeutrinoDBDownloadState) => {
                      setMessage(JSON.stringify(state));
                    },
                  );

                  await lndCache.downloadCache(ENetworks.testnet);
                  // await startLnd();
                }}
              />
              <Button
                title={'Start LND 18443'}
                onPress={async () => {
                  await startLnd({
                    Bitcoind: {
                      'bitcoind.rpchost': '192.168.1.139:18443',
                      'bitcoind.rpcuser': 'polaruser',
                      'bitcoind.rpcpass': 'polarpass',
                      'bitcoind.zmqpubrawblock': 'tcp://192.168.1.139:28334',
                      'bitcoind.zmqpubrawtx': 'tcp://192.168.1.139:29335',
                    },
                  });
                }}
              />

              <Button
                title={'Start LND 3002'}
                onPress={async () => {
                  await startLnd({
                    Bitcoind: {
                      'bitcoind.rpchost': '192.168.1.139:3002',
                      'bitcoind.rpcuser': 'polaruser',
                      'bitcoind.rpcpass': 'polarpass',
                      'bitcoind.zmqpubrawblock': 'tcp://192.168.1.139:28334',
                      'bitcoind.zmqpubrawtx': 'tcp://192.168.1.139:29335',
                    },
                  });
                }}
              />

              <Button
                title={'Start LND 3003 and 3004 and 3005'}
                onPress={async () => {
                  await startLnd({
                    Bitcoind: {
                      'bitcoind.rpchost': '192.168.1.139:3003',
                      'bitcoind.rpcuser': 'polaruser',
                      'bitcoind.rpcpass': 'polarpass',
                      'bitcoind.zmqpubrawblock': 'tcp://192.168.1.139:3005',
                      'bitcoind.zmqpubrawtx': 'tcp://192.168.1.139:3004',
                      // 'bitcoind.zmqpubrawblock': 'tcp://192.168.1.139:28334',
                      // 'bitcoind.zmqpubrawtx': 'tcp://192.168.1.139:29335',
                    },
                  });
                }}
              />

              <Button
                title={'Start BTCD testnet'}
                onPress={async () => {
                  await startLnd({
                    Bitcoin: {
                      'bitcoin.active': true,
                      'bitcoin.regtest': true,
                      'bitcoin.node': 'btcd',
                    },
                    Btcd: {
                      // 'btcd.dir': '/Users/jason/Documents/btcd/.btcd',
                      // 'btcd.rpchost': 'localhost',
                      'btcd.rpchost': '127.0.0.1:18334',
                      'btcd.rpcuser': 'rpcuser',
                      'btcd.rpcpass': 'rpcpass',
                      'btcd.rpccert': '/Users/jason/Desktop/rpc-reg.cert',
                    },
                  });
                }}
              />

              <Button
                title={'Start BTCD proxy testnet'}
                onPress={async () => {
                  await startLnd({
                    Bitcoin: {
                      'bitcoin.active': true,
                      'bitcoin.regtest': true,
                      'bitcoin.node': 'btcd',
                    },
                    Btcd: {
                      'btcd.rpchost': '127.0.0.1:3003',
                      'btcd.rpcuser': 'rpcuser',
                      'btcd.rpcpass': 'rpcpass',
                      'btcd.rpccert': '/Users/jason/Desktop/rpc-reg.cert',
                    },
                  });
                }}
              />
            </>
          ) : (
            //
            //
            <Button
              title={'Stop LND'}
              onPress={async () => {
                setMessage('Stopping LND...');
                const res = await lnd.stop();
                if (res.isErr()) {
                  setMessage(res.error.message);
                  console.error(res.error);
                  return;
                }

                setMessage(JSON.stringify(res.value));
              }}
            />
          )}

          {showGenerateSeed ? (
            <Button
              title={'Generate seed'}
              onPress={async () => {
                const res = await lnd.walletUnlocker.genSeed();

                if (res.isErr()) {
                  console.error(res.error);
                  return;
                }

                if (res.isOk()) {
                  setSeed(res.value);
                  Clipboard.setString(res.value.join(' '));
                  setMessage(res.value.join(' '));
                }
              }}
            />
          ) : null}

          {showUnlockButton ? (
            <Button
              title={'Unlock wallet'}
              onPress={async () => {
                const res = await lnd.walletUnlocker.unlockWallet(
                  dummyPassword,
                );

                if (res.isErr()) {
                  console.error(res.error);
                  return;
                }

                setMessage('Unlocked.');
              }}
            />
          ) : null}

          {showCreateButton ? (
            <Button
              title={'Init wallet'}
              onPress={async () => {
                const res = await lnd.walletUnlocker.initWallet(
                  dummyPassword,
                  seed,
                );

                if (res.isErr()) {
                  console.error(res.error);
                  return;
                }

                setMessage('Wallet initialised');
              }}
            />
          ) : null}

          {showRpcOptions ? (
            <>
              <Options
                nodePubKey={testNodePubkey}
                nodeAddress={testNodeAddress}
              />
              <PSBT nodePubKey={testNodePubkey} />
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    height: '100%',
  },
  state: {
    textAlign: 'center',
  },
  message: {
    margin: 10,
    textAlign: 'center',
  },
});

export default App;
