import { useState } from 'react';
import {
  Title,
  Text,
  Stack,
  Tabs,
  Group,
  Breadcrumbs,
  Anchor,
} from '@mantine/core';
import {
  IconDashboard,
  IconPackages,
  IconHistory,
  IconUsers,
  IconToolsKitchen2,
} from '@tabler/icons-react';
import InventoryDashboard from './inventory/InventoryDashboard';
import InventoryItems from './inventory/InventoryItems';
import StockMovements from './inventory/StockMovements';
import Suppliers from './inventory/Suppliers';
import MenuManagement from './inventory/MenuManagement';

export default function Inventory() {
  const [activeTab, setActiveTab] = useState<string | null>('dashboard');

  const breadcrumbs = [
    { title: 'Home', href: '/' },
    { title: 'Logistics', href: '#' },
    { title: 'Advanced Inventory Hub', href: '/inventory' },
  ].map((item, index) => (
    <Anchor href={item.href} key={index} size="xs" c="dimmed">
      {item.title}
    </Anchor>
  ));

  return (
    <Stack gap="xl">
      <Stack gap={4}>
        <Breadcrumbs>{breadcrumbs}</Breadcrumbs>
        <Group justify="space-between">
          <div>
            <Title order={2} fw={900} style={{ letterSpacing: '-0.5px' }}>
              Advanced Inventory Hub
            </Title>
            <Text c="dimmed" size="sm">
              Manage raw materials, supplier logistics, and stock value audits.
            </Text>
          </div>
        </Group>
      </Stack>

      <Tabs 
        value={activeTab} 
        onChange={setActiveTab} 
        variant="pills" 
        radius="lg" 
        color="blue"
        styles={{
          tabLabel: { fontWeight: 700 },
          list: { gap: '8px' }
        }}
      >
        <Tabs.List mb="xl">
          <Tabs.Tab 
            value="dashboard" 
            leftSection={<IconDashboard size={18} />}
          >
            Insights & KPIs
          </Tabs.Tab>
          <Tabs.Tab 
            value="items" 
            leftSection={<IconPackages size={18} />}
          >
            Raw Materials
          </Tabs.Tab>
          <Tabs.Tab 
            value="movements" 
            leftSection={<IconHistory size={18} />}
          >
            Audit Trail
          </Tabs.Tab>
          <Tabs.Tab 
            value="suppliers" 
            leftSection={<IconUsers size={18} />}
          >
            Suppliers
          </Tabs.Tab>
          <Tabs.Tab 
            value="menu" 
            leftSection={<IconToolsKitchen2 size={18} />}
          >
            Menu & Recipes
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="dashboard">
          <InventoryDashboard />
        </Tabs.Panel>
        
        <Tabs.Panel value="items">
          <InventoryItems />
        </Tabs.Panel>
        
        <Tabs.Panel value="movements">
          <StockMovements />
        </Tabs.Panel>
        
        <Tabs.Panel value="suppliers">
          <Suppliers />
        </Tabs.Panel>
        
        <Tabs.Panel value="menu">
          <MenuManagement />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
