import { useState, useEffect } from 'react';
import {
  Title,
  Text,
  Paper,
  Table,
  Group,
  TextInput,
  Badge,
  Stack,
  ActionIcon,
  Tooltip,
  ScrollArea,
  Skeleton,
  ThemeIcon,
  Pagination,
  Select,
  Divider,
} from '@mantine/core';
import {
  IconSearch,
  IconArrowUpRight,
  IconArrowDownRight,
  IconArrowBackUp,
} from '@tabler/icons-react';
import api from '../../lib/api';

interface StockMovement {
  id: number;
  inventoryItem: { name: string; unit: string };
  type: string;
  quantity: number;
  unitCost: number | null;
  reason: string | null;
  referenceType: string | null;
  referenceId: string | null;
  supplier: { name: string } | null;
  createdBy: { name: string };
  paymentStatus: string;
  paymentMethod: string;
  paidAmount: number | null;
  createdAt: Date;
}

export default function StockMovements() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<string | null>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [metadata, setMetadata] = useState({ totalPages: 1, total: 0 });

  const fetchMovements = async () => {
    try {
      setLoading(true);
      const res = await api.get('/inventory/movements', {
        params: { 
          search: search || undefined, 
          type: type === 'ALL' ? undefined : type, 
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          page,
          limit: 15
        }
      });
      setMovements(res.data.data);
      setMetadata({ totalPages: res.data.totalPages, total: res.data.total });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, [page, type, startDate, endDate]);

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setPage(1);
      fetchMovements();
    }
  };

  const handleUndo = async (id: number) => {
    if (!confirm('Are you sure you want to UNDO this movement? This will reverse the stock change and delete the record.')) return;
    try {
      await api.post(`/inventory/movements/${id}/undo`);
      fetchMovements();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={3}>Stock Movement Audit Log</Title>
        <Group>
          <TextInput
            placeholder="Search & Press Enter..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyPress}
            style={{ width: 250 }}
          />
          <Select 
            placeholder="Type"
            data={[
              { value: 'ALL', label: 'All Activities' },
              { value: 'STOCK_IN', label: 'Stock In' },
              { value: 'STOCK_OUT', label: 'Stock Out' },
              { value: 'WASTAGE', label: 'Wastage' },
              { value: 'ADJUSTMENT', label: 'Adjustment' },
            ]}
            value={type}
            onChange={(val) => { setType(val); setPage(1); }}
            style={{ width: 150 }}
          />
          <TextInput 
            type="date" 
            placeholder="From" 
            value={startDate} 
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }} 
            style={{ width: 140 }}
          />
          <TextInput 
            type="date" 
            placeholder="To" 
            value={endDate} 
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }} 
            style={{ width: 140 }}
          />
        </Group>
      </Group>

      <Paper withBorder radius="lg" shadow="sm">
        <ScrollArea h={550}>
          <Table verticalSpacing="md" striped highlightOnHover>
            <Table.Thead bg="gray.0">
              <Table.Tr>
                <Table.Th>Timestamp</Table.Th>
                <Table.Th>Inventory Item</Table.Th>
                <Table.Th>Activity Type</Table.Th>
                <Table.Th>Quantity</Table.Th>
                <Table.Th>Total Value</Table.Th>
                <Table.Th>Handled By</Table.Th>
                <Table.Th>Reference / Reason</Table.Th>
                <Table.Th ta="right">Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {loading ? (
                [...Array(8)].map((_, i) => <Table.Tr key={i}><Table.Td colSpan={7}><Skeleton height={40} /></Table.Td></Table.Tr>)
              ) : movements.length === 0 ? (
                <Table.Tr><Table.Td colSpan={7} ta="center" py="xl" c="dimmed">No stock movements found.</Table.Td></Table.Tr>
              ) : (
                movements.map(move => (
                  <Table.Tr key={move.id}>
                    <Table.Td>
                      <Text size="sm">{new Date(move.createdAt).toLocaleDateString()}</Text>
                      <Text size="xs" c="dimmed">{new Date(move.createdAt).toLocaleTimeString()}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text fw={700} size="sm">{move.inventoryItem.name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <ThemeIcon 
                          size="sm" 
                          variant="light" 
                          color={
                            move.type === 'STOCK_IN' ? 'teal' : 
                            move.type === 'STOCK_OUT' ? 'blue' : 
                            move.type === 'WASTAGE' ? 'red' : 'orange'
                          }
                        >
                          {move.type.includes('IN') ? <IconArrowUpRight size={12} /> : <IconArrowDownRight size={12} />}
                        </ThemeIcon>
                        <Badge 
                          size="sm"
                          color={
                            move.type === 'STOCK_IN' ? 'teal' : 
                            move.type === 'STOCK_OUT' ? 'blue' : 
                            move.type === 'WASTAGE' ? 'red' : 'orange'
                          }
                        >
                          {move.type.replace('_', ' ')}
                        </Badge>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={800} c={move.type.includes('IN') ? 'teal' : 'red'}>
                        {move.type.includes('IN') ? '+' : '-'}{move.quantity} {move.inventoryItem.unit}
                      </Text>
                      {move.unitCost && (
                        <Text size="xs" c="dimmed">@ RWF {new Intl.NumberFormat().format(move.unitCost)}</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {move.type === 'STOCK_IN' && move.unitCost ? (
                        <Stack gap={0}>
                          <Group justify="space-between" gap="xs">
                            <Text size="sm" fw={700} c="indigo">RWF {new Intl.NumberFormat().format(move.quantity * move.unitCost)}</Text>
                            <Badge size="xs" variant="light" color={move.paymentStatus === 'PAID' ? 'teal' : 'red'}>
                              {move.paymentStatus === 'UNPAID' && (move.paidAmount || 0) > 0 ? 'PARTIAL' : move.paymentStatus}
                            </Badge>
                          </Group>
                          {move.paymentStatus === 'UNPAID' && (
                            <Text size="xs" c="red" fw={600}>
                              Balance: RWF {new Intl.NumberFormat().format((move.quantity * move.unitCost) - (move.paidAmount || 0))}
                            </Text>
                          )}
                          <Text size="xs" c="dimmed">Paid: RWF {new Intl.NumberFormat().format(move.paidAmount || 0)} via {move.paymentMethod || 'CASH'}</Text>
                        </Stack>
                      ) : (
                        <Text size="xs" c="dimmed">---</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{move.createdBy.name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Tooltip label={move.reason || 'Manual entry'}>
                        <Text size="xs" truncate maw={200}>{move.reason || move.referenceType || '---'}</Text>
                      </Tooltip>
                      {move.supplier && (
                        <Badge size="xs" variant="outline" color="indigo" ml={5}>Supplier: {move.supplier.name}</Badge>
                      )}
                    </Table.Td>
                    <Table.Td ta="right">
                      <Tooltip label="Undo & Reverse Stock">
                        <ActionIcon color="red" variant="subtle" onClick={() => handleUndo(move.id)}>
                          <IconArrowBackUp size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
        <Divider />
        <Group justify="space-between" p="md">
          <Text size="xs" c="dimmed">Showing page {page} of {metadata.totalPages} ({metadata.total} total records)</Text>
          <Pagination total={metadata.totalPages} value={page} onChange={setPage} size="sm" radius="md" />
        </Group>
      </Paper>
    </Stack>
  );
}
