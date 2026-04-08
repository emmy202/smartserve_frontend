import { useState, useEffect } from 'react';
import {
  Title,
  Text,
  Paper,
  SimpleGrid,
  Group,
  Stack,
  ThemeIcon,
  Badge,
  Table,
  RingProgress,
  Skeleton,
} from '@mantine/core';
import {
  IconTrendingUp,
  IconUsers,
  IconHistory,
  IconPackages,
  IconAlertTriangle,
} from '@tabler/icons-react';
import api from '../../lib/api';

interface Stats {
  totalItems: number;
  lowStockItemsCount: number;
  outOfStockItems: number;
  totalStockValue: number;
  totalSupplierDebt: number;
  recentMovements: any[];
  topDebts: any[];
  categorySummary: any[];
}

export default function InventoryDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/inventory/stats');
        setStats(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <Skeleton height={400} radius="xl" />;
  if (!stats) return <Text c="red">Failed to load inventory stats.</Text>;

  return (
    <Stack gap="xl">
      {/* KPI Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
        <Paper withBorder p="xl" radius="lg" shadow="xs">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Total Items</Text>
              <Text size="xl" fw={900}>{stats.totalItems}</Text>
            </div>
            <ThemeIcon color="blue" variant="light" size={48} radius="md">
              <IconPackages size={24} />
            </ThemeIcon>
          </Group>
        </Paper>

        <Paper withBorder p="xl" radius="lg" shadow="xs" bg="blue.0">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="blue.8" tt="uppercase" fw={700}>Inventory Value</Text>
              <Text size="xl" fw={900} c="blue.9">RWF {new Intl.NumberFormat().format(stats.totalStockValue)}</Text>
            </div>
            <ThemeIcon color="blue" variant="filled" size={48} radius="md">
              <IconTrendingUp size={24} />
            </ThemeIcon>
          </Group>
        </Paper>

        <Paper withBorder p="xl" radius="lg" shadow="xs" bg="red.0">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="red.8" tt="uppercase" fw={700}>Total Debt</Text>
              <Text size="xl" fw={900} c="red.9">RWF {new Intl.NumberFormat().format(stats.totalSupplierDebt)}</Text>
            </div>
            <ThemeIcon color="red" variant="filled" size={48} radius="md">
              <IconUsers size={24} />
            </ThemeIcon>
          </Group>
        </Paper>

        <Paper withBorder p="xl" radius="lg" shadow="xs">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Low Stock</Text>
              <Text size="xl" fw={900} c={stats.lowStockItemsCount > 0 ? "orange" : "dimmed"}>
                {stats.lowStockItemsCount}
              </Text>
            </div>
            <ThemeIcon color="orange" variant="light" size={48} radius="md">
              <IconAlertTriangle size={24} />
            </ThemeIcon>
          </Group>
        </Paper>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        {/* Recent Activity */}
        <Paper withBorder radius="lg" p="xl" shadow="xs">
          <Group justify="space-between" mb="xl">
            <Group>
              <IconHistory size={20} color="var(--mantine-color-blue-6)" />
              <Title order={4}>Recent Audit Trail</Title>
            </Group>
          </Group>

          <Table verticalSpacing="md" striped highlightOnHover>
            <Table.Thead bg="gray.0">
              <Table.Tr>
                <Table.Th>Item</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Qty</Table.Th>
                <Table.Th>By</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {stats.recentMovements.map(move => (
                <Table.Tr key={move.id}>
                  <Table.Td>
                    <Text size="sm" fw={500}>{move.inventoryItem.name}</Text>
                    <Text size="xs" c="dimmed">
                      {new Date(move.createdAt).toLocaleDateString()}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge 
                      color={
                        move.type === 'STOCK_IN' ? 'teal' : 
                        move.type === 'STOCK_OUT' ? 'blue' : 
                        move.type === 'WASTAGE' ? 'red' : 'orange'
                      }
                      variant="light"
                      size="sm"
                    >
                      {move.type.replace('_', ' ')}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={700} c={move.type.includes('IN') ? 'teal' : 'red'}>
                      {move.type.includes('IN') ? '+' : '-'}{move.quantity}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs">{move.createdBy.name}</Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>

        <Stack gap="lg">
          {/* Debt Summary */}
          <Paper withBorder radius="lg" p="xl" shadow="xs" bg="red.0" style={{ borderColor: 'var(--mantine-color-red-2)' }}>
            <Group mb="md">
              <IconUsers size={20} color="var(--mantine-color-red-6)" />
              <Title order={4}>Top Vendor Liabilities</Title>
            </Group>
            
            {stats.topDebts?.length > 0 ? (
              <Table verticalSpacing="sm" variant="unstyled">
                <Table.Tbody>
                  {stats.topDebts.map(s => (
                    <Table.Tr key={s.id}>
                      <Table.Td>
                        <Text size="sm" fw={600}>{s.name}</Text>
                      </Table.Td>
                      <Table.Td ta="right">
                        <Text fw={800} c="red.8">RWF {new Intl.NumberFormat().format(s.balance)}</Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            ) : (
              <Text c="dimmed" ta="center" py="xl">No outstanding debts.</Text>
            )}
          </Paper>

          {/* Category Breakdown */}
          <Paper withBorder radius="lg" p="xl" shadow="xs">
            <Group mb="xl">
              <IconPackages size={20} color="var(--mantine-color-teal-6)" />
              <Title order={4}>Category Assets</Title>
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              {stats.categorySummary.map(cat => (
                <Paper key={cat.name} withBorder p="md" radius="md">
                  <Group justify="space-between" wrap="nowrap">
                    <Stack gap={0}>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={700} truncate>{cat.name}</Text>
                      <Text size="md" fw={800}>{cat.count} Items</Text>
                      <Text size="xs" c="teal" fw={700}>
                        RWF {new Intl.NumberFormat().format(cat.value)}
                      </Text>
                    </Stack>
                    <RingProgress
                      size={54}
                      thickness={5}
                      roundCaps
                      sections={[{ value: stats.totalStockValue > 0 ? (cat.value / stats.totalStockValue) * 100 : 0, color: 'teal' }]}
                      label={
                        <Text size="xs" ta="center" fw={700}>
                          {stats.totalStockValue > 0 ? Math.round((cat.value / stats.totalStockValue) * 100) : 0}%
                        </Text>
                      }
                    />
                  </Group>
                </Paper>
              ))}
            </SimpleGrid>
          </Paper>
        </Stack>
      </SimpleGrid>
    </Stack>
  );
}
