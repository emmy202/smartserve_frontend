import { useState, useEffect } from 'react';
import {
  Title,
  Text,
  Paper,
  Table,
  Group,
  TextInput,
  NumberInput,
  Badge,
  ActionIcon,
  Stack,
  Button,
  Modal,
  Select,
  Menu,
  ThemeIcon,
  ScrollArea,
  Skeleton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconSearch,
  IconPlus,
  IconDotsVertical,
  IconEdit,
  IconArrowUpRight,
  IconArrowDownRight,
  IconTrash,
  IconAlertCircle,
  IconReceipt2,
  IconUsers,
} from '@tabler/icons-react';
import api from '../../lib/api';

interface InventoryItem {
  id: number;
  name: string;
  sku: string | null;
  categoryId: number;
  category: { name: string } | null;
  unit: string;
  currentStock: number;
  minimumStock: number;
  costPrice: number;
  type: 'FOOD' | 'DRINK';
  active: boolean;
  preferredSupplierId: number | null;
  preferredSupplier: { name: string } | null;
}

export default function InventoryItems() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // Modals
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [moveOpened, { open: openMove, close: closeMove }] = useDisclosure(false);
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  const [historyOpened, { open: openHistory, close: closeHistory }] = useDisclosure(false);
  
  // States
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({
    name: '', sku: '', categoryId: undefined, unit: 'piece', 
    currentStock: 0, minimumStock: 0, costPrice: 0,
    type: 'FOOD',
    active: true
  });
  const [editingItem, setEditingItem] = useState<Partial<InventoryItem>>({});
  const [movementForm, setMovementForm] = useState({
    type: 'STOCK_IN',
    quantity: 0,
    unitCost: 0,
    reason: '',
    supplierId: '' as string | null,
    paymentStatus: 'PAID',
    paymentMethod: 'CASH',
    paidAmount: 0
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [itemsRes, suppliersRes, categoriesRes] = await Promise.all([
        api.get('/inventory/items'),
        api.get('/inventory/suppliers'),
        api.get('/categories', { params: { type: 'INVENTORY' } })
      ]);
      setItems(itemsRes.data);
      setSuppliers(suppliersRes.data);
      setCategories(categoriesRes.data);
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
    if (!newItem.name) return;
    setSaving(true);
    try {
      await api.post('/inventory/items', newItem);
      fetchData();
      closeCreate();
      setNewItem({
        name: '', sku: '', categoryId: undefined, unit: 'piece', 
        currentStock: 0, minimumStock: 0, costPrice: 0, type: 'FOOD', active: true
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingItem.id) return;
    setSaving(true);
    try {
      await api.put(`/inventory/items/${editingItem.id}`, editingItem);
      fetchData();
      closeEdit();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: number) => {
    if (!window.confirm('Are you sure you want to deactivate this item? It will no longer appear in active inventory.')) return;
    try {
      await api.put(`/inventory/items/${id}`, { active: false });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHistory = async (id: number) => {
    try {
      setLoading(true);
      const res = await api.get(`/inventory/items/${id}/movements`);
      setHistory(res.data);
      openHistory();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
   const handleRecordMovement = async () => {
    if (!selectedItem || !movementForm.quantity) return;
    setSaving(true);
    try {
      await api.post('/inventory/movements', {
        inventoryItemId: selectedItem.id,
        ...movementForm,
        supplierId: movementForm.supplierId ? +movementForm.supplierId : undefined
      });
      fetchData();
      closeMove();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                         (item.sku?.toLowerCase().includes(search.toLowerCase()));
    
    if (activeFilter === 'low') return matchesSearch && item.currentStock <= item.minimumStock;
    if (activeFilter === 'out') return matchesSearch && item.currentStock === 0;
    if (activeFilter === 'food') return matchesSearch && item.type === 'FOOD';
    if (activeFilter === 'drink') return matchesSearch && item.type === 'DRINK';
    return matchesSearch;
  });

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Group>
          <TextInput
            placeholder="Search SKU or Name..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 300 }}
          />
          <Badge 
            variant={activeFilter === 'all' ? 'filled' : 'light'} 
            color="gray" style={{ cursor: 'pointer' }}
            onClick={() => setActiveFilter('all')}
          >
            All Items
          </Badge>
          <Badge 
            variant={activeFilter === 'low' ? 'filled' : 'light'} 
            color="orange" style={{ cursor: 'pointer' }}
            onClick={() => setActiveFilter('low')}
          >
            Low Stock
          </Badge>
          <Badge 
            variant={activeFilter === 'out' ? 'filled' : 'light'} 
            color="red" style={{ cursor: 'pointer' }}
            onClick={() => setActiveFilter('out')}
          >
            Out of Stock
          </Badge>
          <Badge 
            variant={activeFilter === 'food' ? 'filled' : 'light'} 
            color="orange" style={{ cursor: 'pointer' }}
            onClick={() => setActiveFilter('food')}
          >
            Food
          </Badge>
          <Badge 
            variant={activeFilter === 'drink' ? 'filled' : 'light'} 
            color="blue" style={{ cursor: 'pointer' }}
            onClick={() => setActiveFilter('drink')}
          >
            Beverages
          </Badge>
        </Group>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreate} radius="md">
          New Item
        </Button>
      </Group>

      <Paper withBorder radius="lg" shadow="sm">
        <ScrollArea>
          <Table verticalSpacing="md" striped highlightOnHover style={{ minWidth: 1000 }}>
            <Table.Thead bg="gray.0">
              <Table.Tr>
                <Table.Th>SKU & Product</Table.Th>
                <Table.Th>Category</Table.Th>
                <Table.Th>Stock Level</Table.Th>
                <Table.Th>Unit Price</Table.Th>
                <Table.Th>Total Value</Table.Th>
                <Table.Th>Primary Supplier</Table.Th>
                <Table.Th align="right">Manage</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <Table.Tr key={i}>
                    <Table.Td colSpan={7}><Skeleton height={40} radius="md" /></Table.Td>
                  </Table.Tr>
                ))
              ) : filteredItems.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={7} ta="center" py="xl">
                    <Text c="dimmed">No items found.</Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                filteredItems.map(item => (
                  <Table.Tr key={item.id}>
                    <Table.Td>
                      <Group gap="sm">
                        <div>
                          <Text size="sm" fw={700}>{item.name}</Text>
                          <Text size="xs" c="dimmed">{item.sku || 'No SKU'}</Text>
                        </div>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Badge variant="outline" size="sm">{item.category?.name || 'Uncategorized'}</Badge>
                        <Badge variant="light" size="xs" color={item.type === 'DRINK' ? 'blue' : 'orange'}>
                          {item.type === 'DRINK' ? 'Beverage' : 'Food'}
                        </Badge>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Badge 
                          color={item.currentStock === 0 ? 'red' : item.currentStock <= item.minimumStock ? 'orange' : 'teal'}
                          variant="light"
                        >
                          {item.currentStock} {item.unit}
                        </Badge>
                        {item.currentStock <= item.minimumStock && (
                          <ActionIcon size="xs" color="orange" variant="transparent" title="Low stock alert!">
                            <IconAlertCircle size={14} />
                          </ActionIcon>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={700}>RWF {new Intl.NumberFormat().format(item.costPrice)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={800} c="teal">RWF {new Intl.NumberFormat().format(item.currentStock * item.costPrice)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <ThemeIcon size="xs" color="indigo" variant="light" radius="xl"><IconUsers size={12} /></ThemeIcon>
                        <Text size="xs" fw={500}>{item.preferredSupplier?.name || '---'}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td align="right">
                      <Group gap="xs" justify="flex-end">
                        <Button 
                          size="compact-xs" 
                          leftSection={<IconArrowUpRight size={14} />}
                          color="teal" 
                          variant="light"
                          onClick={() => { setSelectedItem(item); setMovementForm(f => ({...f, type: 'STOCK_IN', unitCost: item.costPrice})); openMove(); }}
                        >
                          Stock In
                        </Button>
                        <Button 
                          size="compact-xs" 
                          leftSection={<IconArrowDownRight size={14} />}
                          color="blue" 
                          variant="light"
                          onClick={() => { setSelectedItem(item); setMovementForm(f => ({...f, type: 'STOCK_OUT'})); openMove(); }}
                        >
                          Usage
                        </Button>
                        <Menu position="bottom-end">
                          <Menu.Target>
                            <ActionIcon size="sm" variant="subtle"><IconDotsVertical size={16} /></ActionIcon>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => { setEditingItem(item); openEdit(); }}>Edit Details</Menu.Item>
                            <Menu.Item leftSection={<IconReceipt2 size={14} />} onClick={() => { setSelectedItem(item); fetchHistory(item.id); }}>View History</Menu.Item>
                            <Menu.Item leftSection={<IconTrash size={14} />} color="red" onClick={() => handleDeactivate(item.id)}>Deactivate</Menu.Item>
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

      {/* Item Creation Modal */}
      <Modal opened={createOpened} onClose={closeCreate} title={<Title order={4}>Register New Raw Item</Title>} centered radius="lg">
        <Stack gap="md">
          <Group grow>
            <TextInput label="Item Name" placeholder="e.g. Tomato Sauce" required value={newItem.name} onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))} />
            <Select label="Type" data={[{ value: 'FOOD', label: 'Food' }, { value: 'DRINK', label: 'Beverage' }]} value={newItem.type} onChange={(val) => setNewItem(prev => ({ ...prev, type: val as any }))} required />
          </Group>
          <TextInput label="SKU" placeholder="TS-001" value={newItem.sku || ''} onChange={(e) => setNewItem(prev => ({ ...prev, sku: e.target.value }))} />
          <Group grow>
            <Select label="Category" data={categories.map(c => ({ value: c.id.toString(), label: c.name }))} value={newItem.categoryId?.toString()} onChange={(val) => setNewItem(prev => ({ ...prev, categoryId: val ? +val : undefined }))} required />
            <Select label="Unit" data={['kg', 'litre', 'bottle', 'piece', 'box']} value={newItem.unit} onChange={(val) => setNewItem(prev => ({ ...prev, unit: val || 'piece' }))} />
          </Group>
          <Group grow>
            <NumberInput label="Cost Price" value={newItem.costPrice} onChange={(val) => setNewItem(prev => ({ ...prev, costPrice: +val }))} />
            <NumberInput label="Min Stock Alert" value={newItem.minimumStock} onChange={(val) => setNewItem(prev => ({ ...prev, minimumStock: +val }))} />
          </Group>
          <Select label="Preferred Supplier" data={suppliers.map(s => ({ value: s.id.toString(), label: s.name }))} value={newItem.preferredSupplierId?.toString()} placeholder="Optional" 
            onChange={(val) => setNewItem(prev => ({ ...prev, preferredSupplierId: val ? +val : undefined }))} />
          <Button fullWidth size="lg" mt="md" onClick={handleCreate} loading={saving}>Add to Inventory</Button>
        </Stack>
      </Modal>

      {/* Item Edit Modal */}
      <Modal opened={editOpened} onClose={closeEdit} title={<Title order={4}>Update {editingItem.name}</Title>} centered radius="lg">
        <Stack gap="md">
          <Group grow>
            <TextInput label="Item Name" required value={editingItem.name || ''} onChange={(e) => setEditingItem(prev => ({ ...prev, name: e.target.value }))} />
            <Select label="Type" data={[{ value: 'FOOD', label: 'Food' }, { value: 'DRINK', label: 'Beverage' }]} value={editingItem.type} onChange={(val) => setEditingItem(prev => ({ ...prev, type: val as any }))} required />
          </Group>
          <TextInput label="SKU" value={editingItem.sku || ''} onChange={(e) => setEditingItem(prev => ({ ...prev, sku: e.target.value }))} />
          <Group grow>
            <Select label="Category" data={categories.map(c => ({ value: c.id.toString(), label: c.name }))} value={editingItem.categoryId?.toString()} onChange={(val) => setEditingItem(prev => ({ ...prev, categoryId: val ? +val : undefined }))} required />
            <Select label="Unit" data={['kg', 'litre', 'bottle', 'piece', 'box']} value={editingItem.unit} onChange={(val) => setEditingItem(prev => ({ ...prev, unit: val || 'piece' }))} />
          </Group>
          <Group grow>
            <NumberInput label="Cost Price" value={editingItem.costPrice} onChange={(val) => setEditingItem(prev => ({ ...prev, costPrice: +val }))} />
            <NumberInput label="Min Stock Alert" value={editingItem.minimumStock} onChange={(val) => setEditingItem(prev => ({ ...prev, minimumStock: +val }))} />
          </Group>
          <Select label="Preferred Supplier" data={suppliers.map(s => ({ value: s.id.toString(), label: s.name }))} value={editingItem.preferredSupplierId?.toString()} placeholder="Optional" 
            onChange={(val) => setEditingItem(prev => ({ ...prev, preferredSupplierId: val ? +val : undefined }))} />
          <Button fullWidth size="lg" mt="md" onClick={handleUpdate} loading={saving}>Save Changes</Button>
        </Stack>
      </Modal>

      {/* Movement Modal */}
      <Modal opened={moveOpened} onClose={closeMove} title={<Title order={4}>{movementForm.type.replace('_', ' ')}: {selectedItem?.name}</Title>} centered radius="lg">
        <Stack gap="md">
          <Group grow>
            <NumberInput label="Quantity" value={movementForm.quantity} onChange={(val) => setMovementForm(f => ({...f, quantity: +val}))} autoFocus required />
            {movementForm.type === 'STOCK_IN' && (
              <NumberInput label="Unit Cost" value={movementForm.unitCost} onChange={(val) => setMovementForm(f => ({...f, unitCost: +val}))} />
            )}
          </Group>
          {movementForm.type === 'STOCK_IN' && (
            <Group grow>
              <Select label="Supplier" data={suppliers.map(s => ({ value: s.id.toString(), label: s.name }))} value={movementForm.supplierId} onChange={(val) => setMovementForm(f => ({...f, supplierId: val}))} />
              <Select 
                label="Payment Status" 
                data={[{ value: 'PAID', label: 'Paid (Full/Cash)' }, { value: 'UNPAID', label: 'Unpaid (Debt)' }]} 
                value={movementForm.paymentStatus} 
                onChange={(val) => setMovementForm(f => ({...f, paymentStatus: val || 'PAID'}))} 
              />
            </Group>
          )}
          {movementForm.type === 'STOCK_IN' && (
            <Group grow>
              <NumberInput 
                label="Paid Amount" 
                placeholder="Amount paid to supplier" 
                value={movementForm.paidAmount} 
                onChange={(val) => setMovementForm(f => ({...f, paidAmount: +val}))} 
                rightSection={
                  <Button variant="subtle" size="compact-xs" 
                    onClick={() => setMovementForm(f => ({...f, paidAmount: f.quantity * f.unitCost}))}
                  >Full</Button>
                }
                rightSectionWidth={60}
              />
              <Select 
                label="Method" 
                data={['CASH', 'MOMO', 'BANK', 'CREDIT']} 
                value={movementForm.paymentMethod} 
                onChange={(val) => setMovementForm(f => ({...f, paymentMethod: val || 'CASH'}))} 
              />
            </Group>
          )}
          {movementForm.type === 'STOCK_IN' && movementForm.paidAmount < (movementForm.quantity * movementForm.unitCost) && (
            <Text size="xs" c="red" fw={500}>
              🚨 Debt Detected: RWF {new Intl.NumberFormat().format((movementForm.quantity * movementForm.unitCost) - movementForm.paidAmount)} will be added to supplier balance.
            </Text>
          )}
          <Select 
            label="Reason" 
            data={movementForm.type === 'STOCK_IN' ? ['New Purchase', 'Return'] : ['Kitchen Use', 'Bar Use', 'Wastage', 'Internal consumption']} 
            value={movementForm.reason} 
            onChange={(val) => setMovementForm(f => ({...f, reason: val || ''}))}
          />
          <TextInput label="Reference / Notes" value={movementForm.reason} onChange={(e) => setMovementForm(f => ({...f, reason: e.target.value}))} />
          <Button 
            fullWidth 
            size="lg" 
            color={movementForm.type === 'STOCK_IN' ? 'teal' : 'blue'} 
            onClick={handleRecordMovement} 
            loading={saving}
          >
            Confirm Movement
          </Button>
        </Stack>
      </Modal>
      {/* Item History Modal */}
      <Modal opened={historyOpened} onClose={closeHistory} title={<Title order={4}>Audit History: {selectedItem?.name}</Title>} size="xl" centered radius="lg">
        {history.length > 0 ? (
          <Table verticalSpacing="sm" striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Date & Time</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Quantity</Table.Th>
                <Table.Th>Total Value</Table.Th>
                <Table.Th>Supplier</Table.Th>
                <Table.Th>User</Table.Th>
                <Table.Th>Note</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {history.map(m => (
                <Table.Tr key={m.id}>
                  <Table.Td>
                    <Text size="xs">{new Date(m.createdAt).toLocaleDateString()}</Text>
                    <Text size="xs" c="dimmed">{new Date(m.createdAt).toLocaleTimeString()}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge 
                      size="xs" 
                      color={m.type.includes('IN') ? 'teal' : 'blue'} 
                      variant="light"
                    >
                      {m.type.replace('_', ' ')}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={700} c={m.type.includes('IN') ? 'teal' : 'red'}>
                      {m.type.includes('IN') ? '+' : '-'}{m.quantity}
                    </Text>
                    {m.unitCost && (
                      <Text size="xs" c="dimmed">@ RWF {new Intl.NumberFormat().format(m.unitCost)}</Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {m.type === 'STOCK_IN' && m.unitCost ? (
                      <Stack gap={0}>
                        <Group justify="space-between" gap="xs">
                          <Text size="sm" fw={700} c="indigo">RWF {new Intl.NumberFormat().format(m.quantity * m.unitCost)}</Text>
                          <Badge size="xs" variant="light" color={m.paymentStatus === 'PAID' ? 'teal' : 'red'}>
                            {m.paymentStatus === 'UNPAID' && (m.paidAmount || 0) > 0 ? 'PARTIAL' : m.paymentStatus}
                          </Badge>
                        </Group>
                        {m.paymentStatus === 'UNPAID' && (
                          <Text size="xs" c="red" fw={600}>
                            Balance: RWF {new Intl.NumberFormat().format((m.quantity * m.unitCost) - (m.paidAmount || 0))}
                          </Text>
                        )}
                        <Text size="xs" c="dimmed">Paid: RWF {new Intl.NumberFormat().format(m.paidAmount || 0)} via {m.paymentMethod || 'CASH'}</Text>
                      </Stack>
                    ) : (
                      <Text size="xs" c="dimmed">---</Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" fw={600} c="indigo">{m.supplier?.name || '---'}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs">{m.createdBy?.name || 'System'}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" truncate maw={120}>{m.reason || '---'}</Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        ) : (
          <Text c="dimmed" ta="center" py="xl">No audit history found for this item.</Text>
        )}
      </Modal>
    </Stack>
  );
}
