import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppShell,
  Avatar,
  Badge,
  Burger,
  Divider,
  Group,
  Menu,
  NavLink,
  ActionIcon,
  Stack,
  Text,
  Title,
  Affix,
  Notification,
  Indicator,
  ScrollArea,
  ThemeIcon,
  UnstyledButton,
  rem,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom';
import {
  IconBellRinging,
  IconBed,
  IconBusinessplan,
  IconCash,
  IconChevronRight,
  IconClipboardList,
  IconDashboard,
  IconLogout,
  IconReceipt2,
  IconToolsKitchen2,
  IconUserCircle,
  IconUsers,
  IconCheck,
  IconBox,
  IconReportAnalytics,
} from '@tabler/icons-react';
import api from '../lib/api';
import useAuthStore from '../store/authStore';
import dayjs from 'dayjs';

type UserRole =
  | 'ADMIN'
  | 'MANAGER'
  | 'WAITER'
  | 'KITCHEN_STAFF'
  | 'BAR_STAFF'
  | 'CASHIER'
  | 'RECEPTIONIST';

interface ReadyItem {
  id: number;
  quantity: number;
  status: string;
  menuItem: {
    name: string;
    type?: string;
  };
  table?: string | null;
  orderId?: number;
}

interface OrderItemApi {
  id: number;
  quantity: number;
  status: string;
  menuItem: {
    name: string;
    type?: string;
  };
}

interface OrderApi {
  id: number;
  userId: number;
  tableNumber: string | null;
  status: string;
  items: OrderItemApi[];
}

interface NavItem {
  icon: typeof IconDashboard;
  label: string;
  path: string;
  roles: UserRole[] | null;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    icon: IconDashboard,
    label: 'Dashboard',
    path: '/dashboard',
    roles: ['ADMIN', 'MANAGER'],
    description: 'View live business summary',
  },
  {
    icon: IconReceipt2,
    label: 'Create Order',
    path: '/orders',
    roles: ['ADMIN', 'MANAGER', 'WAITER', 'CASHIER'],
    description: 'Post new food and drink orders',
  },
  {
    icon: IconToolsKitchen2,
    label: 'Preparation Queue',
    path: '/kitchen',
    roles: ['ADMIN', 'MANAGER', 'KITCHEN_STAFF', 'BAR_STAFF'],
    description: 'Track food and drink preparation',
  },
  {
    icon: IconCash,
    label: 'Cashier',
    path: '/cashier',
    roles: ['ADMIN', 'MANAGER', 'CASHIER'],
    description: 'Receive payments and close sales',
  },
  {
    icon: IconBed,
    label: 'Rooms',
    path: '/rooms',
    roles: null,
    description: 'Manage occupied and available rooms',
  },
  {
    icon: IconBusinessplan,
    label: 'Expenses',
    path: '/expenses',
    roles: ['ADMIN', 'MANAGER', 'WAITER'],
    description: 'Track operational spending',
  },
  {
    icon: IconClipboardList,
    label: 'Requests',
    path: '/requests',
    roles: ['ADMIN', 'MANAGER', 'WAITER'],
    description: 'Review and manage internal requests',
  },
  {
    icon: IconUsers,
    label: 'Users',
    path: '/users',
    roles: ['ADMIN'],
    description: 'Manage staff accounts and access',
  },
  {
    icon: IconBox,
    label: 'Inventory',
    path: '/inventory',
    roles: ['ADMIN', 'MANAGER', 'KITCHEN_STAFF', 'BAR_STAFF'],
    description: 'Manage real-time stock levels',
  },
  {
    icon: IconClipboardList,
    label: 'Enterprise Capital',
    path: '/assets',
    roles: ['ADMIN', 'MANAGER'],
    description: 'Track furniture, gear & maintenance',
  },
  {
    icon: IconReportAnalytics,
    label: 'Financial Reports',
    path: '/reports',
    roles: ['ADMIN', 'MANAGER'],
    description: 'Review sales vs expenses analysis',
  },
];

const roleColors: Record<string, string> = {
  ADMIN: 'red',
  MANAGER: 'violet',
  WAITER: 'blue',
  KITCHEN_STAFF: 'orange',
  BAR_STAFF: 'teal',
  CASHIER: 'green',
  RECEPTIONIST: 'grape',
};

const roleLabels: Record<string, string> = {
  ADMIN: 'System Admin',
  MANAGER: 'Management',
  WAITER: 'Service Waiter',
  KITCHEN_STAFF: 'Chef / Kitchen',
  BAR_STAFF: 'Barman / Drink Counter',
  CASHIER: 'Cashier / Finance',
  RECEPTIONIST: 'Receptionist',
};

function isPathActive(currentPath: string, itemPath: string) {
  return currentPath === itemPath || currentPath.startsWith(`${itemPath}/`);
}

function getInitials(name?: string) {
  if (!name) return 'SS';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default function AppLayout() {
  const [opened, { toggle, close }] = useDisclosure(false);
  const [readyItems, setReadyItems] = useState<ReadyItem[]>([]);
  const notifiedIds = useRef<Set<number>>(new Set());
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user, isAuthenticated } = useAuthStore();

  const visibleNavItems = useMemo(() => {
    return NAV_ITEMS.filter((item) => !item.roles || (user?.role && item.roles.includes(user.role as UserRole)));
  }, [user?.role]);

  const currentSection = useMemo(() => {
    return visibleNavItems.find((item) => isPathActive(location.pathname, item.path))?.label ?? 'SmartServe HMS';
  }, [location.pathname, visibleNavItems]);

  const fetchReadyItems = useCallback(async () => {
    if (!user || user.role !== 'WAITER') return;

    try {
      const res = await api.get('/orders');
      const orders: OrderApi[] = Array.isArray(res.data) ? res.data : [];

      const unacknowledged: ReadyItem[] = [];

      orders
        .filter((order) => order.userId === user.id && order.status !== 'CANCELLED')
        .forEach((order) => {
          order.items?.forEach((item) => {
            if (item.status === 'READY' && !notifiedIds.current.has(item.id)) {
              unacknowledged.push({
                id: item.id,
                quantity: item.quantity,
                status: item.status,
                menuItem: item.menuItem,
                table: order.tableNumber,
                orderId: order.id,
              });
            }
          });
        });

      if (!unacknowledged.length) return;

      setReadyItems((prev) => {
        const existing = new Set(prev.map((item) => item.id));
        const fresh = unacknowledged.filter((item) => !existing.has(item.id));
        return [...prev, ...fresh];
      });
    } catch (error) {
      console.error('Failed to check ready items:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchReadyItems();

    if (!user || user.role !== 'WAITER') return;

    const interval = window.setInterval(fetchReadyItems, 10000);
    return () => window.clearInterval(interval);
  }, [fetchReadyItems, user]);

  const dismissNotification = (id: number) => {
    setReadyItems((prev) => prev.filter((item) => item.id !== id));
    notifiedIds.current.add(id);
  };

  const dismissAllNotifications = () => {
    readyItems.forEach((item) => notifiedIds.current.add(item.id));
    setReadyItems([]);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    close();
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppShell
      header={{ height: 72 }}
      navbar={{ width: 300, breakpoint: 'md', collapsed: { mobile: !opened } }}
      padding="md"
      withBorder={false}
    >
      <AppShell.Header px="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
        <Group h="100%" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger opened={opened} onClick={toggle} hiddenFrom="md" size="sm" />

            <Group gap="sm" wrap="nowrap">
              <ThemeIcon size={42} radius="xl" variant="gradient" gradient={{ from: 'blue', to: 'cyan', deg: 135 }}>
                <IconReceipt2 size={22} />
              </ThemeIcon>

              <div>
                <Title order={3} lh={1.1}>
                  SmartServe HMS
                </Title>
                <Group gap={8}>
                  <Text size="sm" c="dimmed">
                    {currentSection}
                  </Text>
                  <Text size="xs" c="dimmed" fw={700}>
                    • {dayjs().format('DD MMM YYYY')}
                  </Text>
                </Group>
              </div>
            </Group>
          </Group>

          <Group gap="sm" wrap="nowrap">
            {user?.role === 'WAITER' && (
              <Menu shadow="md" width={320} position="bottom-end">
                <Menu.Target>
                  <Indicator inline label={readyItems.length} size={18} disabled={readyItems.length === 0}>
                    <ActionIcon variant="light" size="lg" radius="xl" aria-label="Ready items notifications">
                      <IconBellRinging size={18} />
                    </ActionIcon>
                  </Indicator>
                </Menu.Target>

                <Menu.Dropdown>
                  <Menu.Label>Ready to serve</Menu.Label>
                  {readyItems.length === 0 ? (
                    <Menu.Item disabled>No pending ready-item alerts</Menu.Item>
                  ) : (
                    <>
                      {readyItems.slice(0, 5).map((item) => (
                        <Menu.Item
                          key={item.id}
                          leftSection={<IconCheck size={14} />}
                          onClick={() => dismissNotification(item.id)}
                        >
                          <Text size="sm" fw={600}>
                            {item.quantity}x {item.menuItem.name}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {item.table ? `Table ${item.table}` : `Order #${item.orderId}`}
                          </Text>
                        </Menu.Item>
                      ))}
                      <Menu.Divider />
                      <Menu.Item color="blue" onClick={dismissAllNotifications}>
                        Mark all as seen
                      </Menu.Item>
                    </>
                  )}
                </Menu.Dropdown>
              </Menu>
            )}

            <Menu shadow="md" width={240} position="bottom-end">
              <Menu.Target>
                <UnstyledButton>
                  <Group gap="sm" wrap="nowrap">
                    <Avatar radius="xl" color="blue" variant="light">
                      {getInitials(user?.name)}
                    </Avatar>
                    <div style={{ textAlign: 'left' }}>
                      <Text size="sm" fw={600} lineClamp={1}>
                        {user?.name}
                      </Text>
                      <Badge size="xs" color={roleColors[user?.role || ''] || 'gray'} variant="light">
                        {roleLabels[user?.role || ''] || user?.role}
                      </Badge>
                    </div>
                    <IconChevronRight size={16} style={{ opacity: 0.6 }} />
                  </Group>
                </UnstyledButton>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>Signed in account</Menu.Label>
                <Menu.Item leftSection={<IconUserCircle size={16} />}>
                  <Text size="sm" fw={600}>
                    {user?.name}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {user?.email || 'SmartServe staff'}
                  </Text>
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item color="red" leftSection={<IconLogout size={16} />} onClick={handleLogout}>
                  Logout
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        <AppShell.Section grow component={ScrollArea} scrollbarSize={6}>
          <Stack gap={6}>
            <Text size="xs" tt="uppercase" fw={700} c="dimmed" px="xs" pt="xs">
              Navigation
            </Text>

            {visibleNavItems.map((item) => {
              const active = isPathActive(location.pathname, item.path);

              return (
                <NavLink
                  key={item.path}
                  variant="filled"
                  active={active}
                  onClick={() => handleNavigate(item.path)}
                  label={item.label}
                  description={item.description}
                  leftSection={<item.icon size={18} stroke={1.7} />}
                  rightSection={<IconChevronRight size={14} style={{ opacity: 0.5 }} />}
                  styles={{
                    root: {
                      borderRadius: rem(14),
                      marginBottom: rem(4),
                    },
                    label: {
                      fontWeight: 600,
                    },
                  }}
                />
              );
            })}
          </Stack>
        </AppShell.Section>

        <AppShell.Section>
          <Divider my="sm" />
          <NavLink
            color="red"
            label="Logout"
            description="End the current session"
            leftSection={<IconLogout size={18} stroke={1.7} />}
            onClick={handleLogout}
            styles={{
              root: {
                borderRadius: rem(14),
              },
              label: {
                fontWeight: 600,
              },
            }}
          />
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <div
          style={{
            padding: 'var(--mantine-spacing-lg)',
            minHeight: 'calc(100vh - 72px)',
            background: 'linear-gradient(180deg, rgba(248,250,252,1) 0%, rgba(255,255,255,1) 32%)',
          }}
        >
          <Outlet />
        </div>
      </AppShell.Main>

      {readyItems.length > 0 && (
        <Affix position={{ bottom: 20, right: 20 }} zIndex={1000}>
          <Stack gap="sm">
            {readyItems.slice(0, 3).map((item) => (
              <Notification
                key={item.id}
                withCloseButton
                onClose={() => dismissNotification(item.id)}
                color="green"
                radius="lg"
                icon={<IconBellRinging size={18} />}
                title="Order ready for delivery"
                style={{ width: 360, boxShadow: 'var(--mantine-shadow-lg)' }}
              >
                <Text size="sm">
                  <Text component="span" fw={700}>
                    {item.quantity}x {item.menuItem.name}
                  </Text>{' '}
                  is ready to be served {item.table ? `for Table ${item.table}` : `for Order #${item.orderId}`}.
                </Text>
              </Notification>
            ))}
          </Stack>
        </Affix>
      )}
    </AppShell>
  );
}
