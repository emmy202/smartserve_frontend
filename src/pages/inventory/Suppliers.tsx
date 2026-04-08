import { useState, useEffect } from 'react';
import {
  Title,
  Text,
  Paper,
  Group,
  TextInput,
  Badge,
  Stack,
  Button,
  Modal,
  Skeleton,
  SimpleGrid,
  ThemeIcon,
  ActionIcon,
  Menu,
  Divider,
  NumberInput,
  Select,
  Table,
  ScrollArea,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconSearch,
  IconPlus,
  IconPhone,
  IconAt,
  IconMapPin,
  IconDotsVertical,
  IconEdit,
  IconTrash,
  IconUserCheck,
  IconReceipt2,
  IconCheck,
  IconX,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import api from '../../lib/api';

interface Supplier {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  active: boolean;
  balance: number;
  totalPurchases: number;
  totalPaid: number;
  payments: any[];
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  const [payOpened, { open: openPay, close: closePay }] = useDisclosure(false);
  const [historyOpened, { open: openHistory, close: closeHistory }] = useDisclosure(false);
  
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    method: 'CASH',
    reference: '',
    notes: ''
  });

  const [newSupplier, setNewSupplier] = useState<Partial<Supplier>>({
    name: '', phone: '', email: '', address: '', active: true
  });
  const [editingSupplier, setEditingSupplier] = useState<Partial<Supplier>>({});

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/inventory/suppliers');
      setSuppliers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async () => {
    if (!newSupplier.name) return;
    setSaving(true);
    try {
      await api.post('/inventory/suppliers', newSupplier);
      notifications.show({
        title: 'Supplier Added',
        message: `${newSupplier.name} registered in directory.`,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
      fetchData();
      closeCreate();
      setNewSupplier({ name: '', phone: '', email: '', address: '', active: true });
    } catch (err: any) {
      notifications.show({
        title: 'Registration Error',
        message: err.response?.data?.message || 'Failed to register supplier.',
        color: 'red',
        icon: <IconX size={16} />,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingSupplier.id) return;
    setSaving(true);
    try {
      await api.put(`/inventory/suppliers/${editingSupplier.id}`, editingSupplier);
      notifications.show({
        title: 'Supplier Updated',
        message: `${editingSupplier.name} profile saved.`,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
      fetchData();
      closeEdit();
    } catch (err: any) {
      notifications.show({
        title: 'Update Failed',
        message: err.response?.data?.message || 'Failed to update partner info.',
        color: 'red',
        icon: <IconX size={16} />,
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = (supplier: Supplier) => {
    const nextActive = !supplier.active;
    modals.openConfirmModal({
      title: nextActive ? 'Reactivate Partner' : 'Deactivate Partner',
      children: (
        <Text size="sm">
          Are you sure you want to {nextActive ? 'reactivate' : 'deactivate'} <b>{supplier.name}</b>?
          {nextActive ? ' They will be able to supply goods again.' : ' They will no longer appear in active procurement lists.'}
        </Text>
      ),
      labels: { confirm: nextActive ? 'Reactivate' : 'Deactivate', cancel: 'Cancel' },
      confirmProps: { color: nextActive ? 'blue' : 'red' },
      onConfirm: async () => {
        try {
          await api.put(`/inventory/suppliers/${supplier.id}`, { ...supplier, active: nextActive });
          notifications.show({
            title: 'Status Updated',
            message: `${supplier.name} is now ${nextActive ? 'active' : 'deactivated'}.`,
            color: 'blue',
            icon: <IconUserCheck size={16} />,
          });
          fetchData();
        } catch (err: any) {
          notifications.show({
            title: 'Action Failed',
            message: 'Failed to update partner status.',
            color: 'red',
            icon: <IconX size={16} />,
          });
        }
      },
    });
  };

  const handleRecordPayment = async () => {
    if (!selectedSupplier || !paymentForm.amount) return;

    modals.openConfirmModal({
      title: 'Confirm Payment',
      children: (
        <Text size="sm">
          You are about to record a payment of <b>RWF {new Intl.NumberFormat().format(paymentForm.amount)}</b> 
          to <b>{selectedSupplier.name}</b> via {paymentForm.method}. Proceed?
        </Text>
      ),
      labels: { confirm: 'Confirm Payment', cancel: 'Back' },
      confirmProps: { color: 'teal' },
      onConfirm: async () => {
        setSaving(true);
        try {
          await api.post('/inventory/suppliers/payments', {
            ...paymentForm,
            supplierId: selectedSupplier.id
          });
          notifications.show({
            title: 'Settlement Recorded',
            message: `Payment of RWF ${new Intl.NumberFormat().format(paymentForm.amount)} confirmed.`,
            color: 'teal',
            icon: <IconCheck size={16} />,
          });
          fetchData();
          closePay();
          setPaymentForm({ amount: 0, method: 'CASH', reference: '', notes: '' });
        } catch (err: any) {
          notifications.show({
            title: 'Payment Error',
            message: err.response?.data?.message || 'Failed to record transaction.',
            color: 'red',
            icon: <IconX size={16} />,
          });
        } finally {
          setSaving(false);
        }
      }
    });
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <TextInput
          placeholder="Search suppliers..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 300 }}
        />
        <Button leftSection={<IconPlus size={16} />} onClick={openCreate} radius="md">
          New Supplier
        </Button>
      </Group>

      {loading ? (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {[...Array(6)].map((_, i) => <Skeleton key={i} height={200} radius="lg" />)}
        </SimpleGrid>
      ) : filteredSuppliers.length === 0 ? (
        <Paper withBorder p="xl" radius="lg" ta="center" bg="gray.0">
          <Text c="dimmed">No suppliers found.</Text>
        </Paper>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {filteredSuppliers.map(s => (
            <Paper key={s.id} withBorder radius="lg" p="xl" shadow="xs">
              <Group justify="space-between" align="flex-start" mb="md">
                <ThemeIcon color="blue" variant="light" size={42} radius="md">
                  <IconUserCheck size={24} />
                </ThemeIcon>
                <Group gap={5}>
                  {s.balance > 0 && (
                    <Button 
                      size="compact-xs" 
                      color="teal" 
                      variant="light" 
                      leftSection={<IconReceipt2 size={14}/>}
                      onClick={() => { setSelectedSupplier(s); setPaymentForm(f => ({...f, amount: s.balance})); openPay(); }}
                    >
                      Settle Debt
                    </Button>
                  )}
                  <Menu position="bottom-end" withinPortal>
                    <Menu.Target>
                      <ActionIcon variant="subtle" size="sm"><IconDotsVertical size={16} /></ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item leftSection={<IconReceipt2 size={14} />} onClick={() => { setSelectedSupplier(s); openHistory(); }}>Payment History</Menu.Item>
                      <Divider />
                      <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => { setEditingSupplier(s); openEdit(); }}>Edit Profile</Menu.Item>
                      <Menu.Item 
                        leftSection={s.active ? <IconTrash size={14} /> : <IconUserCheck size={14} />} 
                        color={s.active ? "red" : "blue"}
                        onClick={() => toggleStatus(s)}
                      >
                        {s.active ? 'Deactivate Partner' : 'Reactivate Partner'}
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Group>
              </Group>

              <Title order={5} mb="sm">{s.name}</Title>
              
              <Stack gap="xs">
                {s.phone && (
                  <Group gap={8} wrap="nowrap">
                    <IconPhone size={14} color="gray" />
                    <Text size="xs">{s.phone}</Text>
                  </Group>
                )}
                {s.email && (
                  <Group gap={8} wrap="nowrap">
                    <IconAt size={14} color="gray" />
                    <Text size="xs" truncate>{s.email}</Text>
                  </Group>
                )}
                {s.address && (
                  <Group gap={8} wrap="nowrap">
                    <IconMapPin size={14} color="gray" />
                    <Text size="xs" truncate>{s.address}</Text>
                  </Group>
                )}

                <Stack gap="xs" mt="lg">
                  <Divider variant="dashed" />
                  <Group grow>
                    <div>
                      <Text size="xs" c="dimmed">Total Spending</Text>
                      <Text size="xs" fw={700}>RWF {new Intl.NumberFormat().format(s.totalPurchases)}</Text>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed">Cleared Amount</Text>
                      <Text size="xs" fw={700} c="blue">RWF {new Intl.NumberFormat().format(s.totalPaid)}</Text>
                    </div>
                  </Group>
                  <Group justify="space-between" align="flex-end">
                    <Badge variant="dot" color={s.active ? 'teal' : 'gray'}>
                      {s.active ? 'Active Partner' : 'Inactive'}
                    </Badge>
                    <Stack gap={2} align="flex-end">
                      <Text size="xs" c="dimmed">Outstanding</Text>
                      <Text size="sm" fw={800} c={s.balance > 0 ? "red" : "teal"}>
                        RWF {new Intl.NumberFormat().format(s.balance)}
                      </Text>
                    </Stack>
                  </Group>
                </Stack>
              </Stack>
            </Paper>
          ))}
        </SimpleGrid>
      )}

      {/* Creation Modal */}
      <Modal opened={createOpened} onClose={closeCreate} title={<Title order={4}>Register New Supplier</Title>} centered radius="lg">
        <Stack gap="md">
          <TextInput label="Supplier Name" placeholder="e.g. Fresh Veggies Ltd" required value={newSupplier.name} onChange={(e) => setNewSupplier(prev => ({ ...prev, name: e.target.value }))} />
          <Group grow>
            <TextInput label="Phone Number" placeholder="+250..." value={newSupplier.phone || ''} onChange={(e) => setNewSupplier(prev => ({ ...prev, phone: e.target.value }))} />
            <TextInput label="Email Address" placeholder="vendor@example.com" value={newSupplier.email || ''} onChange={(e) => setNewSupplier(prev => ({ ...prev, email: e.target.value }))} />
          </Group>
          <TextInput label="Address" placeholder="Kigali, Rwanda" value={newSupplier.address || ''} onChange={(e) => setNewSupplier(prev => ({ ...prev, address: e.target.value }))} />
          <Button fullWidth size="lg" mt="md" onClick={handleCreate} loading={saving}>Add to Directory</Button>
        </Stack>
      </Modal>

      {/* Edit Modal */}
      <Modal opened={editOpened} onClose={closeEdit} title={<Title order={4}>Update {editingSupplier.name}</Title>} centered radius="lg">
        <Stack gap="md">
          <TextInput label="Supplier Name" required value={editingSupplier.name || ''} onChange={(e) => setEditingSupplier(prev => ({ ...prev, name: e.target.value }))} />
          <Group grow>
            <TextInput label="Phone Number" value={editingSupplier.phone || ''} onChange={(e) => setEditingSupplier(prev => ({ ...prev, phone: e.target.value }))} />
            <TextInput label="Email Address" value={editingSupplier.email || ''} onChange={(e) => setEditingSupplier(prev => ({ ...prev, email: e.target.value }))} />
          </Group>
          <TextInput label="Address" value={editingSupplier.address || ''} onChange={(e) => setEditingSupplier(prev => ({ ...prev, address: e.target.value }))} />
          <Button fullWidth size="lg" mt="md" onClick={handleUpdate} loading={saving}>Save Changes</Button>
        </Stack>
      </Modal>

      {/* Debt Settlement Modal */}
      <Modal opened={payOpened} onClose={closePay} title={<Title order={4}>Record Payment: {selectedSupplier?.name}</Title>} centered radius="lg">
        <Stack gap="md">
          <Text size="sm" c="dimmed">Clear outstanding debt for this supplier.</Text>
          <NumberInput 
            label="Payment Amount" 
            placeholder="Amount" 
            required 
            prefix="RWF " 
            value={paymentForm.amount} 
            onChange={(val) => setPaymentForm(f => ({ ...f, amount: +val }))}
            autoFocus
          />
          <Group grow>
            <Select 
              label="Method" 
              data={['CASH', 'MOMO', 'BANK TRANSFER', 'CHECK']} 
              value={paymentForm.method} 
              onChange={(val) => setPaymentForm(f => ({ ...f, method: val || 'CASH' }))} 
            />
            <TextInput 
              label="Reference #" 
              placeholder="TxID / Code" 
              value={paymentForm.reference} 
              onChange={(e) => setPaymentForm(f => ({ ...f, reference: e.target.value }))} 
            />
          </Group>
          <TextInput 
            label="Notes" 
            placeholder="..." 
            value={paymentForm.notes} 
            onChange={(e) => setPaymentForm(f => ({ ...f, notes: e.target.value }))} 
          />
          <Button fullWidth size="lg" color="teal" mt="md" onClick={handleRecordPayment} loading={saving}>Confirm Settlement</Button>
        </Stack>
      </Modal>

      {/* Payment History Modal */}
      <Modal opened={historyOpened} onClose={closeHistory} title={<Title order={4}>Payment Ledger: {selectedSupplier?.name}</Title>} size="lg" centered radius="lg">
        {selectedSupplier && selectedSupplier.payments?.length > 0 ? (
          <ScrollArea>
            <Table verticalSpacing="sm" striped highlightOnHover style={{ minWidth: 400 }}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Method</Table.Th>
                  <Table.Th>Ref</Table.Th>
                  <Table.Th ta="right">Amount</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {selectedSupplier.payments.map((p: any) => (
                  <Table.Tr key={p.id}>
                    <Table.Td>
                      <Text size="xs">{new Date(p.createdAt).toLocaleDateString()}</Text>
                      <Text size="xs" c="dimmed">{new Date(p.createdAt).toLocaleTimeString()}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge size="xs" variant="outline">{p.method}</Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" truncate maw={100}>{p.reference || 'N/A'}</Text>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text size="sm" fw={700} c="blue">RWF {new Intl.NumberFormat().format(p.amount)}</Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        ) : (
          <Text c="dimmed" ta="center" py="xl">No payment records found for this supplier.</Text>
        )}
      </Modal>
    </Stack>
  );
}
