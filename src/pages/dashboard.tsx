import { v4 } from 'uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import Peripheral, { Characteristic, Service } from 'react-native-peripheral';
import { SERVICE_UUID } from '../constants';
import { ParamListProps } from '../utils/ParamList';
import { FlatList } from 'react-native-gesture-handler';

const Dashboard = ({ navigation }: ParamListProps<'Dashboard'>) => {
  // const [devices, setDevices] = useState<Device[]>([]);
  const [contactList, setContactList] = useState([]);
  const manager = useMemo(() => new BleManager(), []);

  const proximity = (device: Device): number | undefined => {
    if (!device) {
      return;
    }
    const ENV_CONSTANT = 4;
    const distance =
      10 ** ((device.txPowerLevel || -69 - device.rssi!) / (10 * ENV_CONSTANT));
    return distance;
  };

  const handleDevice = async (device: Device): Promise<void> => {
    if (proximity(device)! < 2) {
      console.log(device.name, proximity(device));
      const services = device.serviceUUIDs;
      if (services && services.includes(SERVICE_UUID)) {
        try {
          device = await device.connect({ timeout: 5000 });
        } catch (error) {
          console.error('Failed to connect: ' + error);
        }
        try {
          device = await device.discoverAllServicesAndCharacteristics();
          const characteristics = await device.characteristicsForService(
            SERVICE_UUID
          );
          console.log(
            'Characteristic:',
            characteristics[0].uuid,
            'for device:',
            device.name
          );
          console.log('VALUE:', characteristics[0].uuid);
          let contacts = await AsyncStorage.getItem('contacts');
          await AsyncStorage.setItem(
            'contacts',
            JSON.stringify([
              ...(contacts ? JSON.parse(contacts) : []),
              { key: characteristics[0].uuid, date: new Date() },
            ])
          );
          contacts = await AsyncStorage.getItem('contacts');
          console.log('My Contacts: ' + contacts);
        } catch (error) {
          console.error(error);
        }
      }
    }
  };

  const scanNearbyDevices = () => {
    const subscription = manager.onStateChange((state) => {
      if (state === 'PoweredOn') {
        manager.startDeviceScan(null, {}, (error, device) => {
          if (error) {
            console.log('Error:', error);
          }
          if (device !== null) {
            handleDevice(device);
          }
        });
        subscription.remove();
      }
    }, true);
  };

  useEffect(() => {
    scanNearbyDevices();

    Peripheral.onStateChanged(async (state) => {
      if (state === 'poweredOn') {
        const tempKey = v4();
        let currentKeys = await AsyncStorage.getItem('keys');
        const contacts = await AsyncStorage.getItem('contacts');

        if (contacts) {
          setContactList(JSON.parse(contacts));
        }

        await AsyncStorage.setItem(
          'keys',
          JSON.stringify([
            ...(currentKeys ? JSON.parse(currentKeys) : []),
            { key: tempKey, date: new Date() },
          ])
        );

        const characteristic = new Characteristic({
          uuid: tempKey,
          value: '',
          properties: ['read'],
          permissions: ['readable'],
        });

        const service = new Service({
          uuid: SERVICE_UUID,
          characteristics: [characteristic],
        });

        Peripheral.addService(service).then(() => {
          Peripheral.startAdvertising({
            name: 'Contact Tracing Peripheral',
            serviceUuids: [SERVICE_UUID],
          });
        });
      }
    });

    return () => {
      manager.stopDeviceScan();
      manager.destroy();
    };
  }, [manager]);

  return (
    <View style={styles.container}>
      <Text>Contact Tracing</Text>
      <FlatList
        data={contactList}
        renderItem={({ item }: { item: any }) => (
          <Text style={styles.contact}>{item.key}</Text>
        )}
        keyExtractor={() => v4()}
      />
      <Button title="Report" onPress={() => navigation.navigate('Report')} />
    </View>
  );
};

const styles = StyleSheet.create({
  heading: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  container: {
    padding: 26,
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contact: {
    marginBottom: 6,
  },
});

export default Dashboard;
