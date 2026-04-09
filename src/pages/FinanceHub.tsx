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
  Select,
  Grid,
  Progress,
  Tabs,
  Tooltip,
  Divider,
  Pagination,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import {
  IconTrendingUp,
  IconTrendingDown,
  IconCash,
  IconShoppingCart,
  IconReportAnalytics,
  IconRefresh,
  IconListCheck,
  IconInfoCircle,
  IconPrinter,
  IconReceipt2,
} from '@tabler/icons-react';
import api from '../lib/api';
import dayjs from 'dayjs';

interface FinanceReport {
  revenue: number;
  expense: number;
  procurement: number;
  recipeCost: number;
  totalOutflow: number;
  cashFlowProfit: number;
  realPerformanceProfit: number;
  breakdown: {
    expenses: { category: string; _sum: { amount: number } }[];
    sales: { paymentStatus: string; _sum: { totalAmount: number } }[];
  }
}

interface LedgerEntry {
  period: string;
  paidRevenue: number;
  unpaidRevenue: number;
  generalExpense: number;
  procurementExpense: number;
  totalRevenue: number;
  totalExpense: number;
  profit: number;
  recipeCost: number;
  grossProfit: number;
}

interface ProfitAnalysis {
  name: string;
  quantitySold: number;
  revenue: number;
  totalCost: number;
  unitPrice: number;
  unitCost: number;
  profit: number;
  margin: number;
}

interface Expense {
  id: number;
  title: string;
  amount: number;
  category: string;
  createdAt: string;
  user: { name: string };
  status: string;
}

interface ProductSales {
  date: string;
  id: number;
  name: string;
  category: string;
  type: string;
  sold: number;
  revenue: number;
  unitPrice: number;
  currentStock: number | null;
}

export default function FinanceHub() {
  const [data, setData] = useState<FinanceReport | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [profitAnalysis, setProfitAnalysis] = useState<ProfitAnalysis[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [productSales, setProductSales] = useState<ProductSales[]>([]);
  const [productPage, setProductPage] = useState(1);
  const productsPerPage = 10;
  const [loading, setLoading] = useState(true);
  
  // Custom Date Range
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    dayjs().startOf('month').toDate(),
    dayjs().endOf('day').toDate(),
  ]);

  const [ledgerType, setLedgerType] = useState<'DAILY' | 'MONTHLY'>('DAILY');

  const fetchData = useCallback(async () => {
    if (!dateRange[0] || !dateRange[1]) return;
    setLoading(true);
    try {
      const start = dateRange[0].toISOString();
      const end = dateRange[1].toISOString();
      
      const [financeRes, ledgerRes, profitRes, expenseRes, inventoryRes] = await Promise.all([
        api.get('/reports/finance', { params: { start, end } }),
        api.get('/reports/ledger', { params: { type: ledgerType, start, end } }),
        api.get('/reports/profit-analysis', { params: { start, end } }),
        api.get('/expenses', { params: { start, end } }),
        api.get('/orders/inventory-report', { params: { start, end } })
      ]);
      setData(financeRes.data);
      setLedger(ledgerRes.data);
      setProfitAnalysis(profitRes.data);
      setExpenses(expenseRes.data || []);
      setProductSales(inventoryRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [dateRange, ledgerType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePrint = () => {
    window.print();
  };

  const formatRWF = (val: number) => `RWF ${new Intl.NumberFormat().format(Math.round(val || 0))}`;
  const formatShortRWF = (val: number) => `RWF ${new Intl.NumberFormat(undefined, { notation: 'compact' }).format(Math.round(val || 0))}`;
  const profitColor = (data?.realPerformanceProfit || 0) >= 0 ? 'teal' : 'red';
  const cashFlowColor = (data?.cashFlowProfit || 0) >= 0 ? 'teal' : 'red';

  return (
    <Stack gap="xl">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-full { width: 100% !important; margin: 0 !important; padding: 0 !important; }
          body { background: white !important; }
          .mantine-AppShell-navbar { display: none !important; }
          .mantine-AppShell-header { display: none !important; }
          .mantine-AppShell-main { padding: 0 !important; margin: 0 !important; }
          .print-only { display: block !important; }
          .print-header { margin-bottom: 2rem; border-bottom: 2px solid #333; padding-bottom: 1rem; }
        }
        .print-only { display: none; }
      `}</style>

      {/* Print-Only Header */}
      <div className="print-only print-header">
        <Group justify="space-between">
          <div>
            <Title order={1}>SMARTSERVE FINANCIAL REPORT</Title>
            <Text>Period: {dayjs(dateRange[0]).format('DD MMM YYYY')} to {dayjs(dateRange[1]).format('DD MMM YYYY')}</Text>
          </div>
          <IconReceipt2 size={48} />
        </Group>
      </div>

      <Group justify="space-between" align="flex-end" className="no-print">
        <div>
          <Title order={2}>Financial Ledger & Printing Center</Title>
          <Text size="sm" c="dimmed">Analyze your business performance within any specified date range.</Text>
        </div>
        <Group align="flex-end">
          <Stack gap={4}>
            <Text size="xs" fw={700} c="dimmed" tt="uppercase">Quick Select</Text>
            <Group gap="xs">
              <Button 
                variant="subtle" 
                size="xs" 
                onClick={() => setDateRange([dayjs().startOf('day').toDate(), dayjs().endOf('day').toDate()])}
              >
                Today
              </Button>
              <Button 
                variant="subtle" 
                size="xs" 
                onClick={() => setDateRange([dayjs().subtract(1, 'day').startOf('day').toDate(), dayjs().subtract(1, 'day').endOf('day').toDate()])}
              >
                Yesterday
              </Button>
              <Button 
                variant="subtle" 
                size="xs" 
                onClick={() => setDateRange([dayjs().startOf('month').toDate(), dayjs().endOf('day').toDate()])}
              >
                This Month
              </Button>
            </Group>
          </Stack>
          <DatePickerInput
            type="range"
            label="Custom Date Range"
            placeholder="Select dates"
            value={dateRange}
            onChange={(val: any) => setDateRange(val)}
            style={{ minWidth: 280 }}
          />
          <Button variant="light" leftSection={<IconRefresh size={16} />} onClick={fetchData} loading={loading} mt="xl">Refresh</Button>
          <Button color="dark" leftSection={<IconPrinter size={16} />} onClick={handlePrint} mt="xl">Print Report</Button>
        </Group>
      </Group>

      <Tabs variant="pills" defaultValue="summary" radius="md" className="print-full">
        <Tabs.List mb="lg" className="no-print">
          <Tabs.Tab value="summary" leftSection={<IconReportAnalytics size={16} />}>Executive Summary</Tabs.Tab>
          <Tabs.Tab value="ledger" leftSection={<IconListCheck size={16} />}>Historical Ledger</Tabs.Tab>
          <Tabs.Tab value="products" leftSection={<IconListCheck size={16} />}>Product Sales</Tabs.Tab>
          <Tabs.Tab value="expenses" leftSection={<IconTrendingDown size={16} />}>Expense Tracker</Tabs.Tab>
          <Tabs.Tab value="profit" leftSection={<IconTrendingUp size={16} />}>Recipe-Based Profit</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="summary">
          <Stack gap="xl">
            {/* KPIs */}
            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
              <Paper withBorder p="md" radius="lg" shadow="xs">
                <Group justify="space-between">
                  <div>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Total Revenue</Text>
                    <Text size="lg" fw={900}>{formatRWF(data?.revenue || 0)}</Text>
                  </div>
                  <ThemeIcon color="blue" size={36} radius="md" variant="light"><IconTrendingUp size={20} /></ThemeIcon>
                </Group>
              </Paper>
              <Paper withBorder p="md" radius="lg" shadow="xs">
                <Group justify="space-between">
                  <div>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Total Expenses</Text>
                    <Text size="lg" fw={900}>{formatRWF(data?.expense || 0)}</Text>
                  </div>
                  <ThemeIcon color="orange" size={36} radius="md" variant="light"><IconTrendingDown size={20} /></ThemeIcon>
                </Group>
              </Paper>
              <Paper withBorder p="md" radius="lg" shadow="xs">
                <Group justify="space-between">
                  <div>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Procurement</Text>
                    <Text size="lg" fw={900}>{formatRWF(data?.procurement || 0)}</Text>
                  </div>
                  <ThemeIcon color="cyan" size={36} radius="md" variant="light"><IconShoppingCart size={20} /></ThemeIcon>
                </Group>
              </Paper>
              <Paper withBorder p="md" radius="lg" shadow="sm" style={{ background: `var(--mantine-color-${profitColor}-0)` }}>
                <Group justify="space-between">
                  <div>
                    <Group gap="xs">
                      <Text size="xs" c={profitColor} tt="uppercase" fw={700}>Real Profit (Performance)</Text>
                      <Tooltip label="Revenue minus Production Costs (Recipes) and General Expenses. This is your actual performance."><IconInfoCircle size={14} /></Tooltip>
                    </Group>
                    <Text size="lg" fw={900} c={profitColor}>{formatRWF(data?.realPerformanceProfit || 0)}</Text>
                  </div>
                  <ThemeIcon color={profitColor} size={36} radius="md" variant="filled"><IconTrendingUp size={20} /></ThemeIcon>
                </Group>
              </Paper>
              <Paper withBorder p="md" radius="lg" shadow="sm" style={{ background: `var(--mantine-color-${cashFlowColor}-0)` }}>
                <Group justify="space-between">
                  <div>
                    <Group gap="xs">
                      <Text size="xs" c={cashFlowColor} tt="uppercase" fw={700}>Cash Flow (Net Cash In)</Text>
                      <Tooltip label="Revenue minus all cash outflow (Procurement + Expenses). This is how much cash you actually kept."><IconInfoCircle size={14} /></Tooltip>
                    </Group>
                    <Text size="lg" fw={900} c={cashFlowColor}>{formatRWF(data?.cashFlowProfit || 0)}</Text>
                  </div>
                  <ThemeIcon color={cashFlowColor} size={36} radius="md" variant="light"><IconCash size={20} /></ThemeIcon>
                </Group>
              </Paper>
            </SimpleGrid>

            <Grid gutter="xl">
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Paper withBorder p="lg" radius="lg">
                  <Title order={4} mb="md">Settlement Breakdown</Title>
                  <Stack gap="md">
                    {data?.breakdown.sales.map((s, i) => (
                      <div key={i}>
                        <Group justify="space-between" mb={4}>
                          <Text size="sm" fw={600}>{s.paymentStatus}</Text>
                          <Text size="sm" fw={700}>{formatRWF(s._sum.totalAmount)}</Text>
                        </Group>
                        <Progress value={((s._sum.totalAmount || 0) / (data.revenue || 1)) * 100} color={s.paymentStatus === 'PAID' ? 'teal' : 'red'} size="sm" radius="xl" />
                      </div>
                    ))}
                  </Stack>
                </Paper>
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Paper withBorder p="lg" radius="lg">
                  <Title order={4} mb="md">Expense Categories</Title>
                  <Table>
                    <Table.Thead><Table.Tr><Table.Th>Category</Table.Th><Table.Th ta="right">Amount</Table.Th></Table.Tr></Table.Thead>
                    <Table.Tbody>
                      {data?.breakdown.expenses.map((e, i) => (
                        <Table.Tr key={i}>
                          <Table.Td><Badge variant="outline" color="gray">{e.category}</Badge></Table.Td>
                          <Table.Td ta="right" fw={700}>{formatRWF(e._sum.amount)}</Table.Td>
                        </Table.Tr>
                      ))}
                      <Table.Tr style={{ background: 'var(--mantine-color-gray-0)' }}>
                        <Table.Td><Text fw={700}>Stock Procurement</Text></Table.Td>
                        <Table.Td ta="right" fw={700}>{formatRWF(data?.procurement || 0)}</Table.Td>
                      </Table.Tr>
                    </Table.Tbody>
                  </Table>
                </Paper>
              </Grid.Col>
            </Grid>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="ledger">
          <Paper withBorder radius="lg" p="md" className="print-full">
            <Group justify="space-between" mb="md" className="no-print">
              <Title order={4}>Historical Audit Tracker</Title>
              <Select 
                size="xs"
                value={ledgerType}
                onChange={(val) => setLedgerType(val as any)}
                data={[{ value: 'DAILY', label: 'Daily Reports' }, { value: 'MONTHLY', label: 'Monthly Reports' }]}
              />
            </Group>
            <Table.ScrollContainer minWidth={1000}>
            <Table verticalSpacing="sm" highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{ledgerType === 'DAILY' ? 'Date' : 'Month'}</Table.Th>
                  <Table.Th>
                    <Group gap={4}>Sales <Tooltip label="Paid / Unpaid Revenue"><IconInfoCircle size={14} className="no-print" /></Tooltip></Group>
                  </Table.Th>
                  <Table.Th>
                    <Group gap={4}>Expenses <Tooltip label="General / Procurement Outflow"><IconInfoCircle size={14} className="no-print" /></Tooltip></Group>
                  </Table.Th>
                  <Table.Th ta="right">Net Profit</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {ledger.map((entry, i) => (
                  <Table.Tr key={i}>
                    <Table.Td><Text fw={700}>{entry.period}</Text></Table.Td>
                    <Table.Td>
                      <Stack gap={2}>
                        <Text size="sm" color="teal.8" fw={800}>{formatShortRWF(entry.totalRevenue)}</Text>
                        <Group gap={4} wrap="nowrap">
                          <Badge size="xs" color="teal" variant="light" circle={false}>P: {formatShortRWF(entry.paidRevenue)}</Badge>
                          <Badge size="xs" color="red" variant="light" circle={false}>U: {formatShortRWF(entry.unpaidRevenue)}</Badge>
                        </Group>
                      </Stack>
                    </Table.Td>
                    <Table.Td>
                       <Stack gap={2}>
                        <Text size="sm" color="orange.8" fw={800}>{formatShortRWF(entry.totalExpense)}</Text>
                        <Group gap={4} wrap="nowrap">
                          <Badge size="xs" color="orange" variant="light">G: {formatShortRWF(entry.generalExpense)}</Badge>
                          <Badge size="xs" color="cyan" variant="light">S: {formatShortRWF(entry.procurementExpense)}</Badge>
                        </Group>
                      </Stack>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Badge size="md" color={entry.profit >= 0 ? 'teal' : 'red'} variant="filled">
                        {formatRWF(entry.profit)}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
                {ledger.length === 0 && <Table.Tr><Table.Td colSpan={4} align="center"><Text py="xl" c="dimmed">No historical data available for this range.</Text></Table.Td></Table.Tr>}
              </Table.Tbody>
            </Table>
            </Table.ScrollContainer>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="products">
          <Paper withBorder radius="lg" p="md" mt="md">
            <SimpleGrid cols={{ base: 1, sm: 2 }} mb="xl">
              <Paper withBorder p="md" radius="md" bg="blue.0" style={{ borderLeft: '5px solid var(--mantine-color-blue-6)' }}>
                <Text size="xs" c="blue.9" fw={800} tt="uppercase">Total Sales Revenue (All Products)</Text>
                <Title order={2} c="blue.9" mt={4}>
                  {formatRWF(productSales.reduce((sum, p) => sum + p.revenue, 0))}
                </Title>
                <Text size="xs" c="dimmed" mt={4}>Combined earnings for the selected period</Text>
              </Paper>
              <Paper withBorder p="md" radius="md" bg="teal.0" style={{ borderLeft: '5px solid var(--mantine-color-teal-6)' }}>
                <Text size="xs" c="teal.9" fw={800} tt="uppercase">Total Units Distributed</Text>
                <Title order={2} c="teal.9" mt={4}>
                  {new Intl.NumberFormat().format(productSales.reduce((sum, p) => sum + p.sold, 0))} Units
                </Title>
                <Text size="xs" c="dimmed" mt={4}>Total quantity of items moved out of stock</Text>
              </Paper>
            </SimpleGrid>

            <Group justify="space-between" mb="md">
              <div>
                <Title order={4}>Product Performance & Sales Rank</Title>
                <Text size="sm" c="dimmed">Track exactly how many of each item was sold and the revenue it generated.</Text>
              </div>
              <Badge size="lg" color="blue" variant="light">{productSales.length} Active Products</Badge>
            </Group>

            <Table.ScrollContainer minWidth={1000}>
              <Table verticalSpacing="md" highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Date</Table.Th>
                    <Table.Th>Product Name</Table.Th>
                    <Table.Th>Category</Table.Th>
                    <Table.Th ta="right">Unit Price</Table.Th>
                    <Table.Th ta="center">Units Sold</Table.Th>
                    <Table.Th ta="right">Total Revenue</Table.Th>
                    <Table.Th ta="center">Stock Status</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {productSales.length > 0 ? productSales.slice((productPage - 1) * productsPerPage, productPage * productsPerPage).map((product, idx) => (
                    <Table.Tr key={`${product.id}-${product.date}-${idx}`}>
                      <Table.Td>
                        <Text fw={700} size="sm">{dayjs(product.date).format('DD MMM YYYY')}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text fw={700}>{product.name}</Text>
                        <Badge size="xs" variant="light" color={product.type === 'FOOD' ? 'orange' : 'cyan'}>{product.type}</Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge color="gray" variant="outline">{product.category}</Badge>
                      </Table.Td>
                      <Table.Td ta="right">{formatRWF(product.unitPrice)}</Table.Td>
                      <Table.Td ta="center">
                        <Text fw={800} size="lg">{product.sold}</Text>
                      </Table.Td>
                      <Table.Td ta="right">
                        <Text fw={700} c="blue">{formatRWF(product.revenue)}</Text>
                      </Table.Td>
                      <Table.Td ta="center">
                        {product.currentStock !== null ? (
                          <Badge 
                            color={product.currentStock <= 5 ? 'red' : product.currentStock <= 15 ? 'orange' : 'teal'} 
                            variant="dot"
                          >
                            {product.currentStock} remaining
                          </Badge>
                        ) : (
                          <Text size="xs" c="dimmed">Not tracked</Text>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  )) : (
                    <Table.Tr>
                      <Table.Td colSpan={5} align="center">
                        <Text py="xl" c="dimmed">No sales recorded for the selected period.</Text>
                      </Table.Td>
                    </Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
            {productSales.length > productsPerPage && (
              <Group justify="center" mt="xl">
                <Pagination 
                  total={Math.ceil(productSales.length / productsPerPage)} 
                  value={productPage} 
                  onChange={setProductPage} 
                  radius="xl"
                />
              </Group>
            )}
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="expenses">
          <Stack gap="lg">
            <SimpleGrid cols={{ base: 1, md: 2 }}>
              <Paper withBorder p="lg" radius="lg">
                <Title order={4} mb="md">Categorical Distribution</Title>
                <Stack gap="md">
                  {data?.breakdown.expenses.map((e, i) => (
                    <div key={i}>
                      <Group justify="space-between" mb={4}>
                        <Text size="sm" fw={600}>{e.category}</Text>
                        <Text size="sm" fw={700}>{formatRWF(e._sum.amount)}</Text>
                      </Group>
                      <Progress value={((e._sum.amount || 0) / (data.expense || 1)) * 100} color="orange" size="sm" radius="xl" />
                    </div>
                  ))}
                  {(!data?.breakdown.expenses || data.breakdown.expenses.length === 0) && <Text c="dimmed">No expenses categorized.</Text>}
                </Stack>
              </Paper>
              <Paper withBorder p="lg" radius="lg">
                <Title order={4} mb="md">Top Expenses (Highest Outflow)</Title>
                <Table.ScrollContainer minWidth={400}>
                  <Table verticalSpacing="xs">
                    <Table.Thead><Table.Tr><Table.Th>Title</Table.Th><Table.Th ta="right">Amount</Table.Th></Table.Tr></Table.Thead>
                    <Table.Tbody>
                      {[...expenses].sort((a,b) => b.amount - a.amount).slice(0, 5).map((exp) => (
                        <Table.Tr key={exp.id}>
                          <Table.Td>
                            <Text size="sm" fw={600}>{exp.title}</Text>
                            <Text size="xs" c="dimmed">{exp.category}</Text>
                          </Table.Td>
                          <Table.Td ta="right" fw={700} c="red">{formatRWF(exp.amount)}</Table.Td>
                        </Table.Tr>
                      ))}
                      {expenses.length === 0 && <Table.Tr><Table.Td colSpan={2} align="center"><Text size="sm" c="dimmed">No records.</Text></Table.Td></Table.Tr>}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              </Paper>
            </SimpleGrid>

            <Paper withBorder radius="lg" p="md">
              <Title order={4} mb="md">Detailed Expense Log</Title>
              <Table.ScrollContainer minWidth={1000}>
                <Table verticalSpacing="sm" highlightOnHover withTableBorder>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Date</Table.Th>
                      <Table.Th>Requested By</Table.Th>
                      <Table.Th>Description</Table.Th>
                      <Table.Th>Category</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th ta="right">Amount</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {expenses.map((exp) => (
                      <Table.Tr key={exp.id}>
                        <Table.Td><Text size="sm">{dayjs(exp.createdAt).format('DD MMM YYYY')}</Text></Table.Td>
                        <Table.Td><Text size="sm" fw={600}>{exp.user.name}</Text></Table.Td>
                        <Table.Td><Text size="sm">{exp.title}</Text></Table.Td>
                        <Table.Td><Badge variant="light" color="gray">{exp.category}</Badge></Table.Td>
                        <Table.Td>
                          <Badge variant="dot" color={exp.status === 'APPROVED' ? 'teal' : exp.status === 'PENDING' ? 'yellow' : 'red'}>
                            {exp.status}
                          </Badge>
                        </Table.Td>
                        <Table.Td ta="right" fw={700}>{formatRWF(exp.amount)}</Table.Td>
                      </Table.Tr>
                    ))}
                    {expenses.length === 0 && <Table.Tr><Table.Td colSpan={6} align="center"><Text py="xl" c="dimmed">No expenses found for this range.</Text></Table.Td></Table.Tr>}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            </Paper>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="profit">
          <Paper withBorder radius="lg" p="md">
            <Title order={4} mb="md">Recipe-Based Profitability Analysis</Title>
            <Text size="sm" c="dimmed" mb="xl">This breakdown calculates profit based on the raw material costs defined in each item's recipe.</Text>
            
            <Table.ScrollContainer minWidth={1000}>
            <Table verticalSpacing="sm" highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Menu Item</Table.Th>
                  <Table.Th ta="center">Qty Sold</Table.Th>
                  <Table.Th>Unit Price/Cost</Table.Th>
                  <Table.Th>Total Revenue</Table.Th>
                  <Table.Th>Production Cost</Table.Th>
                  <Table.Th>Gross Profit</Table.Th>
                  <Table.Th ta="right">Margin %</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {profitAnalysis.map((item, i) => (
                  <Table.Tr key={i}>
                    <Table.Td><Text fw={700}>{item.name}</Text></Table.Td>
                    <Table.Td ta="center"><Badge variant="outline">{item.quantitySold}</Badge></Table.Td>
                    <Table.Td>
                      <Stack gap={0}>
                        <Text size="xs">Price: {formatRWF(item.unitPrice)}</Text>
                        <Text size="xs" c="dimmed">Cost: {formatRWF(item.unitCost)}</Text>
                      </Stack>
                    </Table.Td>
                    <Table.Td><Text size="sm" fw={600}>{formatRWF(item.revenue)}</Text></Table.Td>
                    <Table.Td><Text size="sm" color="orange.8">{formatRWF(item.totalCost)}</Text></Table.Td>
                    <Table.Td>
                      <Text size="sm" color="teal.8" fw={700}>{formatRWF(item.profit)}</Text>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Badge size="lg" color={item.margin > 30 ? 'teal' : item.margin > 15 ? 'orange' : 'red'} variant="filled">
                        {item.margin.toFixed(1)}%
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
                {profitAnalysis.length === 0 && <Table.Tr><Table.Td colSpan={7} align="center"><Text py="xl" c="dimmed">No recipe data available for items sold in this range.</Text></Table.Td></Table.Tr>}
              </Table.Tbody>
            </Table>
            </Table.ScrollContainer>
          </Paper>
        </Tabs.Panel>
      </Tabs>
      
      <Divider my="sm" className="no-print" />
      <Paper withBorder p="md" radius="lg" bg="gray.0" className="no-print">
        <Text size="xs" c="dimmed" ta="center">SmartServe Financial Forensic Module &copy; 2026 for Advanced Reporting & Integrity.</Text>
      </Paper>
    </Stack>
  );
}
