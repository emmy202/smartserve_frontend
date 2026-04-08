import { useEffect, useState, useCallback } from 'react';
import {
  Title,
  Text,
  Stack,
  Group,
  Paper,
  SimpleGrid,
  ThemeIcon,
  Table,
  Badge,
  Button,
  ActionIcon,
  Modal,
  TextInput,
  NumberInput,
  Select,
  ScrollArea,
  Menu,
  Divider,
  Skeleton,
  Textarea,
  Timeline,
  Box,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import {
  IconBox,
  IconPlus,
  IconDotsVertical,
  IconEdit,
  IconTrash,
  IconTools,
  IconHistory,
  IconMapPin,
  IconCalendar,
  IconSearch,
  IconRefresh,
  IconDeviceTv,
  IconSofa,
  IconToolsKitchen2,
  IconCar,
  IconCheck,
  IconX,
} from '@tabler/icons-react';
import { modals } from '@mantine/modals';
import api from '../lib/api';
import dayjs from 'dayjs';

interface Asset {
  id: number;
  name: string;
  category: string;
  serialNumber: string | null;
  purchaseDate: string | null;
  purchasePrice: number;
  currentValue: number | null;
  location: string | null;
  status: 'OPERATIONAL' | 'MAINTENANCE' | 'REPAIR' | 'DISPOSED' | 'LOST';
  conditionNote: string | null;
  lastMaintenance: string | null;
  nextMaintenance: string | null;
  description: string | null;
}

interface AssetStats {
  total: number;
  operational: number;
  maintenance: number;
  repair: number;
  totalValue: number;
}

const CATEGORIES = [
  { value: 'Electronics', label: 'Electronics & IT', icon: IconDeviceTv, color: 'blue' },
  { value: 'Furniture', label: 'Furniture & Decor', icon: IconSofa, color: 'orange' },
  { value: 'Kitchen Equipment', label: 'Kitchen Equipment', icon: IconToolsKitchen2, color: 'teal' },
  { value: 'Vehicles', label: 'Vehicles', icon: IconCar, color: 'indigo' },
  { value: 'Housekeeping', label: 'Housekeeping / Cleaning', icon: IconBox, color: 'cyan' },
];

const STATUS_COLORS: any = {
  OPERATIONAL: 'teal',
  MAINTENANCE: 'orange',
  REPAIR: 'red',
  DISPOSED: 'gray',
  LOST: 'dark',
};

export default function Assets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [stats, setStats] = useState<AssetStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modals
  const [modalOpened, setModalOpened] = useState(false);
  const [detailsOpened, setDetailsOpened] = useState(false);
  
  // Form State
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Asset>>({
    name: '',
    category: 'Electronics',
    status: 'OPERATIONAL',
    purchasePrice: 0,
    location: '',
    serialNumber: '',
    description: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      console.log('Fetching assets and stats...');
      const [assetsRes, statsRes] = await Promise.all([
        api.get('/assets'),
        api.get('/assets/stats'),
      ]);
      setAssets(assetsRes.data);
      setStats(statsRes.data);
      console.log('Fetched assets:', assetsRes.data.length);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenCreate = () => {
    setIsEditing(false);
    setFormData({
      name: '',
      category: 'Electronics',
      status: 'OPERATIONAL',
      purchasePrice: 0,
      location: '',
      serialNumber: '',
      description: '',
      purchaseDate: null,
      lastMaintenance: null,
      nextMaintenance: null,
    });
    setModalOpened(true);
  };

  const handleOpenEdit = (asset: Asset) => {
    setIsEditing(true);
    setSelectedAsset(asset);
    setFormData({ ...asset });
    setModalOpened(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      notifications.show({
        title: 'Form Incomplete',
        message: 'Asset name is required to register new equipment.',
        color: 'red',
        icon: <IconX size={16} />,
      });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...formData,
        purchasePrice: Number(formData.purchasePrice) || 0,
      };

      if (isEditing && selectedAsset) {
        await api.put(`/assets/${selectedAsset.id}`, payload);
        notifications.show({
          title: 'Asset Updated',
          message: `${formData.name} has been updated successfully.`,
          color: 'teal',
          icon: <IconCheck size={16} />,
        });
      } else {
        await api.post('/assets', payload);
        notifications.show({
          title: 'Asset Registered',
          message: `${formData.name} added to the enterprise ledger.`,
          color: 'teal',
          icon: <IconCheck size={16} />,
        });
      }
      setModalOpened(false);
      fetchData();
    } catch (err: any) {
      console.error('Save error:', err);
      notifications.show({
        title: 'Save Failed',
        message: err.response?.data?.message || 'The server encountered an error saving the asset.',
        color: 'red',
        icon: <IconX size={16} />,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (asset: Asset) => {
    modals.openConfirmModal({
      title: 'Remove Asset',
      children: (
        <Text size="sm">
          Are you sure you want to remove <b>{asset.name}</b> from the enterprise ledger? This action is permanent and cannot be undone.
        </Text>
      ),
      labels: { confirm: 'Delete Asset', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await api.delete(`/assets/${asset.id}`);
          notifications.show({
            title: 'Asset Removed',
            message: 'Equipment has been purged from system records.',
            color: 'blue',
            icon: <IconTrash size={16} />,
          });
          fetchData();
        } catch (err: any) {
          notifications.show({
            title: 'Deletion Failed',
            message: 'Cannot delete assets linked to historical financial records.',
            color: 'red',
            icon: <IconX size={16} />,
          });
        }
      },
    });
  };

  const filteredAssets = assets.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.category.toLowerCase().includes(search.toLowerCase()) ||
    a.location?.toLowerCase().includes(search.toLowerCase()) ||
    a.serialNumber?.toLowerCase().includes(search.toLowerCase())
  );

  const parseDate = (val: any) => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  };

  return (
    <Stack gap="xl">
      <Group justify="space-between">
        <div>
          <Title order={2}>Enterprise Assets Management</Title>
          <Text size="sm" c="dimmed">Track hospitality furniture, electronics, and kitchen equipment for forensic oversight.</Text>
        </div>
        <Group>
          <Button variant="light" leftSection={<IconRefresh size={16} />} onClick={fetchData} loading={loading}>Refresh</Button>
          <Button leftSection={<IconPlus size={16} />} onClick={handleOpenCreate}>New Asset</Button>
        </Group>
      </Group>

      {/* Stats Section */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }}>
        <Paper withBorder p="md" radius="lg" shadow="xs">
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Total Assets</Text>
          <Group justify="space-between" mt="xs">
            <Text size="xl" fw={800}>{stats?.total || 0}</Text>
            <ThemeIcon color="blue" variant="light" radius="md"><IconBox size={20} /></ThemeIcon>
          </Group>
        </Paper>
        <Paper withBorder p="md" radius="lg" shadow="xs">
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Operational</Text>
          <Group justify="space-between" mt="xs">
            <Text size="xl" fw={800} c="teal">{stats?.operational || 0}</Text>
            <ThemeIcon color="teal" variant="light" radius="md"><IconCheck size={20} /></ThemeIcon>
          </Group>
        </Paper>
        <Paper withBorder p="md" radius="lg" shadow="xs">
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Under Maintenance</Text>
          <Group justify="space-between" mt="xs">
            <Text size="xl" fw={800} c="orange">{stats?.maintenance || 0}</Text>
            <ThemeIcon color="orange" variant="light" radius="md"><IconTools size={20} /></ThemeIcon>
          </Group>
        </Paper>
        <Paper withBorder p="md" radius="lg" shadow="xs">
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>In Repair</Text>
          <Group justify="space-between" mt="xs">
            <Text size="xl" fw={800} c="red">{stats?.repair || 0}</Text>
            <ThemeIcon color="red" variant="light" radius="md"><IconTools size={20} /></ThemeIcon>
          </Group>
        </Paper>
        <Paper withBorder p="md" radius="lg" shadow="sm" style={{ background: 'var(--mantine-color-indigo-0)' }}>
          <Text size="xs" c="indigo" tt="uppercase" fw={700}>Total Capital Value</Text>
          <Group justify="space-between" mt="xs">
            <Text size="lg" fw={800} c="indigo">RWF {new Intl.NumberFormat().format(stats?.totalValue || 0)}</Text>
          </Group>
        </Paper>
      </SimpleGrid>

      <Paper withBorder radius="lg" shadow="sm">
        <Box p="md">
          <TextInput 
            placeholder="Search by name, serial, or location..." 
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Box>
        <ScrollArea>
          <Table verticalSpacing="md" horizontalSpacing="md" highlightOnHover striped style={{ minWidth: 1000 }}>
            <Table.Thead bg="gray.0">
              <Table.Tr>
                <Table.Th>Asset Name & Category</Table.Th>
                <Table.Th>Serial #</Table.Th>
                <Table.Th>Location</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Purchase Info</Table.Th>
                <Table.Th>Last Maintenance</Table.Th>
                <Table.Th ta="right">Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <Table.Tr key={i}>
                    {[...Array(7)].map((__, j) => <Table.Td key={j}><Skeleton height={20} radius="xl" /></Table.Td>)}
                  </Table.Tr>
                ))
              ) : filteredAssets.length === 0 ? (
                <Table.Tr><Table.Td colSpan={7} ta="center" py="xl"><Text c="dimmed">No assets found matching your criteria.</Text></Table.Td></Table.Tr>
              ) : (
                filteredAssets.map(asset => (
                  <Table.Tr key={asset.id}>
                    <Table.Td>
                      <Group gap="sm">
                        <ThemeIcon radius="md" size="sm" variant="light" color={CATEGORIES.find(c => c.value === asset.category)?.color || 'gray'}>
                          {(() => {
                            const Icon = CATEGORIES.find(c => c.value === asset.category)?.icon || IconBox;
                            return <Icon size={14} />;
                          })()}
                        </ThemeIcon>
                        <div>
                          <Text size="sm" fw={700}>{asset.name}</Text>
                          <Text size="xs" c="dimmed">{asset.category}</Text>
                        </div>
                      </Group>
                    </Table.Td>
                    <Table.Td><Text size="xs" fw={500}>{asset.serialNumber || 'N/A'}</Text></Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        <IconMapPin size={14} color="gray" />
                        <Text size="xs">{asset.location || 'Unknown'}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={STATUS_COLORS[asset.status]} variant="light" size="sm">{asset.status}</Badge>
                    </Table.Td>
                    <Table.Td>
                      <Stack gap={0}>
                        <Text size="xs" fw={700}>RWF {new Intl.NumberFormat().format(asset.purchasePrice)}</Text>
                        <Text size="xs" c="dimmed">{asset.purchaseDate ? dayjs(asset.purchaseDate).format('DD MMM YYYY') : 'Data Missing'}</Text>
                      </Stack>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs">{asset.lastMaintenance ? dayjs(asset.lastMaintenance).format('DD MMM YYYY') : 'Never'}</Text>
                      {asset.nextMaintenance && (
                        <Text size="xs" c="orange" fw={600}>Next: {dayjs(asset.nextMaintenance).format('DD MMM YYYY')}</Text>
                      )}
                    </Table.Td>
                    <Table.Td ta="right">
                      <Group gap={4} justify="flex-end">
                        <ActionIcon variant="light" color="blue" onClick={() => { setSelectedAsset(asset); setDetailsOpened(true); }}><IconHistory size={16} /></ActionIcon>
                        <Menu position="bottom-end" withinPortal shadow="md">
                          <Menu.Target>
                            <ActionIcon variant="light" color="gray"><IconDotsVertical size={16} /></ActionIcon>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => handleOpenEdit(asset)}>Edit Details</Menu.Item>
                            <Menu.Item leftSection={<IconTools size={14} />} onClick={() => handleOpenEdit(asset)}>Routine Service</Menu.Item>
                            <Divider />
                            <Menu.Item leftSection={<IconTrash size={14} />} color="red" onClick={() => handleDelete(asset)}>Remove Asset</Menu.Item>
                          </Menu.Dropdown>
                        </Menu>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Paper>

      {/* CRUD Modal */}
      <Modal 
        opened={modalOpened} 
        onClose={() => setModalOpened(false)} 
        title={<Title order={4}>{isEditing ? `Update Asset` : 'Register New Asset'}</Title>}
        size="lg"
        radius="lg"
      >
        <Stack gap="md">
          <Group grow>
            <TextInput 
              label="Asset Name" 
              required 
              value={formData.name} 
              onChange={(e) => setFormData(prev => ({...prev, name: e.target?.value || ''}))} 
            />
            <Select 
              label="Category" 
              data={CATEGORIES} 
              value={formData.category} 
              onChange={(val) => setFormData(prev => ({...prev, category: val || 'Electronics'}))} 
            />
          </Group>
          <Group grow>
            <TextInput 
              label="Serial Number" 
              placeholder="S/N" 
              value={formData.serialNumber || ''} 
              onChange={(e) => setFormData(prev => ({...prev, serialNumber: e.target.value}))} 
            />
            <TextInput 
              label="Specific Location" 
              placeholder="e.g. Room 102, Lobby" 
              value={formData.location || ''} 
              onChange={(e) => setFormData(prev => ({...prev, location: e.target.value}))} 
            />
          </Group>
          <Group grow>
            <DatePickerInput 
              label="Purchase Date" 
              placeholder="Select date" 
              clearable 
              valueFormat="DD MMM YYYY"
              value={parseDate(formData.purchaseDate)} 
              onChange={(val: any) => {
                const iso = val && typeof val.toISOString === 'function' ? val.toISOString() : (val instanceof Date ? val.toISOString() : null);
                setFormData(prev => ({...prev, purchaseDate: iso}));
              }} 
              dropdownType="modal"
            />
            <NumberInput 
              label="Purchase Price (RWF)" 
              value={formData.purchasePrice} 
              onChange={(val) => setFormData(prev => ({...prev, purchasePrice: +val}))} 
            />
          </Group>

          <Group grow>
            <DatePickerInput 
              label="Last Maintenance" 
              placeholder="When it was last serviced" 
              clearable 
              valueFormat="DD MMM YYYY"
              value={parseDate(formData.lastMaintenance)} 
              onChange={(val: any) => {
                const iso = val && typeof val.toISOString === 'function' ? val.toISOString() : (val instanceof Date ? val.toISOString() : null);
                setFormData(prev => ({...prev, lastMaintenance: iso}));
              }} 
              dropdownType="modal"
            />
            <DatePickerInput 
              label="Next Scheduled Service" 
              placeholder="Next maintenance date" 
              clearable 
              valueFormat="DD MMM YYYY"
              value={parseDate(formData.nextMaintenance)} 
              onChange={(val: any) => {
                const iso = val && typeof val.toISOString === 'function' ? val.toISOString() : (val instanceof Date ? val.toISOString() : null);
                setFormData(prev => ({...prev, nextMaintenance: iso}));
              }} 
              dropdownType="modal"
            />
          </Group>

          <Group grow>
            <Select 
              label="Asset Integrity Status" 
              data={Object.keys(STATUS_COLORS)} 
              value={formData.status} 
              onChange={(val) => setFormData(prev => ({...prev, status: val as any}))} 
            />
            <TextInput 
              label="Specific Location" 
              placeholder="e.g. Room 102, Lobby" 
              value={formData.location || ''} 
              onChange={(e) => setFormData(prev => ({...prev, location: e.target.value}))} 
            />
          </Group>
          
          <Textarea label="Asset Description & Condition Notes" placeholder="Enter technical details or current condition..." value={formData.description || ''} onChange={(e) => setFormData({...formData, description: e.target?.value || ''})} minRows={3} />
          <Button fullWidth mt="md" size="lg" loading={saving} onClick={handleSave}>{isEditing ? 'Save Changes' : 'Register Asset'}</Button>
        </Stack>
      </Modal>

      {/* Asset Audit View */}
      <Modal opened={detailsOpened} onClose={() => setDetailsOpened(false)} title={<Title order={4}>Asset Audit Ledger</Title>} size="lg" radius="lg">
        {selectedAsset && (
          <Stack gap="xl">
            <Paper p="md" radius="md" bg="gray.0">
              <Group justify="space-between">
                <div>
                  <Text size="xl" fw={900}>{selectedAsset.name}</Text>
                  <Text size="sm" c="dimmed">{selectedAsset.serialNumber || 'No Serial Recorded'}</Text>
                </div>
                <Badge size="xl" color={STATUS_COLORS[selectedAsset.status]} variant="filled">{selectedAsset.status}</Badge>
              </Group>
            </Paper>

            <Timeline active={1} bulletSize={24} lineWidth={2}>
              <Timeline.Item bullet={<IconCalendar size={12} />} title="Aquisition">
                <Text size="sm">{selectedAsset.purchaseDate ? `Purchased on ${dayjs(selectedAsset.purchaseDate).format('DD MMM YYYY')}` : 'Purchase date not documented'}</Text>
                <Text size="xs" mt={4} c="dimmed">Initial Capital: RWF {new Intl.NumberFormat().format(selectedAsset.purchasePrice)}</Text>
              </Timeline.Item>
              <Timeline.Item bullet={<IconMapPin size={12} />} title="Current Placement">
                <Text size="sm">Located at {selectedAsset.location || 'General Inventory'}</Text>
              </Timeline.Item>
              <Timeline.Item bullet={<IconTools size={12} />} title="Last Maintenance">
                <Text size="sm">{selectedAsset.lastMaintenance ? `Serviced on ${dayjs(selectedAsset.lastMaintenance).format('DD MMM YYYY')}` : 'No service history found'}</Text>
                <Text size="xs" mt={4} c="orange" fw={600}>
                  Next scheduled service: {selectedAsset.nextMaintenance ? dayjs(selectedAsset.nextMaintenance).format('DD MMM YYYY') : 'Not scheduled'}
                </Text>
              </Timeline.Item>
            </Timeline>

            <Divider label="Technical Details" labelPosition="center" />
            <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{selectedAsset.description || 'No detailed technical documentation available.'}</Text>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
