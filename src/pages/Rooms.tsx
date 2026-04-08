import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Modal,
  Paper,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Switch,
  Tabs,
  Timeline,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
  NumberInput,
  SegmentedControl,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconBed,
  IconBrush,
  IconChecks,
  IconDoor,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconBuilding,
  IconClock,
  IconCalendarEvent
} from '@tabler/icons-react';
import { DatePickerInput } from '@mantine/dates';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import duration from 'dayjs/plugin/duration';

dayjs.extend(relativeTime);
dayjs.extend(duration);
import { modals } from '@mantine/modals';
import api from '../lib/api';
import useAuthStore from '../store/authStore';

interface Room {
  id: number;
  number: string;
  type: string;
  price: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'CLEANING' | 'RESERVED';
  currentCheckIn?: string | null;
  expectedCheckOut?: string | null;
  lastStatusChange?: string | null;
}

type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'CLEANING' | 'RESERVED';
type SortMode = 'NUMBER' | 'PRICE_ASC' | 'PRICE_DESC';
type FilterMode = 'ALL' | RoomStatus;

const statusColor: Record<RoomStatus, string> = {
  AVAILABLE: 'green',
  OCCUPIED: 'red',
  CLEANING: 'yellow',
  RESERVED: 'blue',
};

const statusIcon: Record<RoomStatus, React.ReactNode> = {
  AVAILABLE: <IconChecks size={16} />,
  OCCUPIED: <IconBed size={16} />,
  CLEANING: <IconBrush size={16} />,
  RESERVED: <IconDoor size={16} />,
};

const roomTypes = ['STANDARD', 'DELUXE', 'SUITE', 'PENTHOUSE'];

function formatCurrency(amount: number) {
  return `RWF ${new Intl.NumberFormat('en-US').format(amount || 0)}`;
}

function StatCard({
  label,
  value,
  helper,
  color,
  icon,
}: {
  label: string;
  value: string;
  helper: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <Paper withBorder radius="lg" p="md" shadow="xs">
      <Group justify="space-between" align="flex-start">
        <div>
          <Text size="sm" c="dimmed">
            {label}
          </Text>
          <Text size="xl" fw={800} mt={4}>
            {value}
          </Text>
          <Text size="xs" c="dimmed" mt={6}>
            {helper}
          </Text>
        </div>
        <ThemeIcon size={44} radius="xl" color={color} variant="light">
          {icon}
        </ThemeIcon>
      </Group>
    </Paper>
  );
}

export default function Rooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Room | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('ALL');
  const [sortMode, setSortMode] = useState<SortMode>('NUMBER');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [expectedCheckOut, setExpectedCheckOut] = useState<Date | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>('manage');
  const [addForm, setAddForm] = useState({
    number: '',
    type: 'STANDARD',
    price: 50,
  });

  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const fetchRooms = useCallback(async () => {
    try {
      setError('');
      const res = await api.get('/rooms');
      setRooms(res.data || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      setError('Failed to load rooms. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchRooms, 20000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchRooms]);

  const openManage = (room: Room) => {
    setSelected(room);
    setNewStatus(room.status);
    setExpectedCheckOut(room.expectedCheckOut ? new Date(room.expectedCheckOut) : null);
    fetchHistory(room.id);
    setActiveTab('manage');
  };

  const fetchHistory = async (roomId: number) => {
    setHistoryLoading(true);
    try {
      const res = await api.get(`/rooms/${roomId}/history`);
      setHistory(res.data || []);
    } catch (err) {
      console.error('History error:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const closeManage = () => {
    if (saving) return;
    setSelected(null);
    setNewStatus('');
  };

  const saveStatus = async () => {
    if (!selected || !newStatus) return;

    modals.openConfirmModal({
      title: 'Update Room Status',
      children: (
        <Text size="sm">
          Change status of <b>Room {selected.number}</b> to <Badge color={statusColor[newStatus as RoomStatus]}>{newStatus}</Badge>?
        </Text>
      ),
      labels: { confirm: 'Confirm Update', cancel: 'Back' },
      onConfirm: async () => {
        setSaving(true);
        try {
          await api.put(`/rooms/${selected.id}`, { 
            status: newStatus,
            expectedCheckOut: expectedCheckOut ? expectedCheckOut.toISOString() : null 
          });
          setSelected(null);
          setNewStatus('');
          setExpectedCheckOut(null);
          await fetchRooms();
        } catch (err) {
          console.error(err);
          setError('Failed to update room status.');
        } finally {
          setSaving(false);
        }
      }
    });
  };

  const closeAddModal = () => {
    if (adding) return;
    setAddOpen(false);
    setAddForm({ number: '', type: 'STANDARD', price: 50 });
  };

  const addRoom = async () => {
    if (!addForm.number.trim()) {
      setError('Room number is required.');
      return;
    }

    setAdding(true);
    try {
      await api.post('/rooms', {
        number: addForm.number.trim(),
        type: addForm.type,
        price: Number(addForm.price),
      });
      closeAddModal();
      await fetchRooms();
    } catch (err) {
      console.error(err);
      setError('Failed to add new room.');
    } finally {
      setAdding(false);
    }
  };

  const counts = useMemo(() => {
    return rooms.reduce(
      (acc, room) => {
        acc.total += 1;
        acc[room.status] += 1;
        return acc;
      },
      {
        total: 0,
        AVAILABLE: 0,
        OCCUPIED: 0,
        CLEANING: 0,
        RESERVED: 0,
      }
    );
  }, [rooms]);

  const occupancyRate = useMemo(() => {
    if (!counts.total) return 0;
    return Math.round(((counts.OCCUPIED + counts.RESERVED) / counts.total) * 100);
  }, [counts]);

  const revenuePotential = useMemo(() => {
    return rooms
      .filter((room) => room.status === 'OCCUPIED' || room.status === 'RESERVED')
      .reduce((sum, room) => sum + Number(room.price || 0), 0);
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    const term = search.trim().toLowerCase();

    return [...rooms]
      .filter((room) => (filter === 'ALL' ? true : room.status === filter))
      .filter((room) => {
        if (!term) return true;
        return (
          room.number.toLowerCase().includes(term) ||
          room.type.toLowerCase().includes(term) ||
          room.status.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        if (sortMode === 'PRICE_ASC') return a.price - b.price;
        if (sortMode === 'PRICE_DESC') return b.price - a.price;
        return a.number.localeCompare(b.number, undefined, { numeric: true, sensitivity: 'base' });
      });
  }, [rooms, search, filter, sortMode]);

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <div>
          <Title order={2}>Rooms Management</Title>
          <Text c="dimmed" size="sm" mt={4}>
            Monitor availability, update room status, and keep room operations organized.
          </Text>
        </div>

        <Group gap="sm">
          <Switch
            checked={autoRefresh}
            onChange={(event) => setAutoRefresh(event.currentTarget?.checked ?? false)}
            label="Auto refresh"
          />
          <Tooltip label="Refresh rooms now">
            <ActionIcon variant="light" size="lg" onClick={fetchRooms} loading={loading}>
              <IconRefresh size="1rem" />
            </ActionIcon>
          </Tooltip>
          {isAdmin && (
            <Button leftSection={<IconPlus size={16} />} onClick={() => setAddOpen(true)}>
              Add Room
            </Button>
          )}
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <StatCard
          label="Total Rooms"
          value={String(counts.total)}
          helper="All rooms in the system"
          color="blue"
          icon={<IconBuilding size={20} />}
        />
        <StatCard
          label="Available"
          value={String(counts.AVAILABLE)}
          helper="Ready to assign or sell"
          color="green"
          icon={<IconChecks size={20} />}
        />
        {isAdmin && (
          <StatCard
            label="Occupancy Rate"
            value={`${occupancyRate}%`}
            helper="Occupied and reserved rooms"
            color="red"
            icon={<IconBed size={20} />}
          />
        )}
        {isAdmin && (
          <StatCard
            label="Booked Value"
            value={formatCurrency(revenuePotential)}
            helper="Potential nightly room revenue"
            color="violet"
            icon={<IconDoor size={20} />}
          />
        )}
      </SimpleGrid>

      {error && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          color="red"
          radius="md"
          withCloseButton
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}

      <Card withBorder radius="lg" p="md" shadow="xs">
        <Group justify="space-between" align="end" wrap="wrap">
          <TextInput
            leftSection={<IconSearch size={16} />}
            placeholder="Search by room number, type, or status"
            value={search}
            onChange={(event) => setSearch(event.target?.value ?? '')}
            style={{ flex: 1, minWidth: 260 }}
          />

          <Group>
            <SegmentedControl
              value={filter}
              onChange={(value) => setFilter(value as FilterMode)}
              data={[
                { label: 'All', value: 'ALL' },
                { label: 'Available', value: 'AVAILABLE' },
                { label: 'Occupied', value: 'OCCUPIED' },
                { label: 'Cleaning', value: 'CLEANING' },
                { label: 'Reserved', value: 'RESERVED' },
              ]}
            />
            <Select
              value={sortMode}
              onChange={(value) => setSortMode((value as SortMode) || 'NUMBER')}
              data={[
                { value: 'NUMBER', label: 'Sort: Room Number' },
                { value: 'PRICE_ASC', label: 'Sort: Lowest Price' },
                { value: 'PRICE_DESC', label: 'Sort: Highest Price' },
              ]}
              w={190}
            />
          </Group>
        </Group>

        <Divider my="md" />

        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Showing {filteredRooms.length} room{filteredRooms.length !== 1 ? 's' : ''}
          </Text>
          <Text size="sm" c="dimmed">
            {lastUpdated
              ? `Last updated at ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'Loading...'}
          </Text>
        </Group>
      </Card>

      {loading ? (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }}>
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} height={220} radius="lg" />
          ))}
        </SimpleGrid>
      ) : filteredRooms.length === 0 ? (
        <Paper withBorder radius="lg" p="xl">
          <Text ta="center" c="dimmed">
            No rooms match the current filters.
          </Text>
        </Paper>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }}>
          {filteredRooms.map((room) => (
            <Card
              key={room.id}
              shadow="sm"
              padding="lg"
              radius="lg"
              withBorder
              style={{ borderTop: `5px solid var(--mantine-color-${statusColor[room.status]}-6)` }}
            >
              <Group justify="space-between" align="flex-start" mb="md">
                <div>
                  <Text fw={800} size="xl" lh={1.1}>
                    Room {room.number}
                  </Text>
                  <Text c="dimmed" size="sm" mt={4}>
                    {room.type}
                  </Text>
                </div>
                <Badge
                  color={statusColor[room.status]}
                  variant="light"
                  leftSection={statusIcon[room.status]}
                >
                  {room.status}
                </Badge>
              </Group>

              {isAdmin && (
                <Paper radius="md" p="sm" withBorder bg="gray.0" mb="md">
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Rate per night
                    </Text>
                    <Text fw={700} c="blue">
                      {formatCurrency(room.price)}
                    </Text>
                  </Group>
                </Paper>
              )}

              <Stack gap={8} mb="lg">
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Stay Duration</Text>
                  <Text size="sm" fw={600}>
                    {room.currentCheckIn ? dayjs(room.currentCheckIn).fromNow() : 'N/A'}
                  </Text>
                </Group>
                
                {room.status === 'OCCUPIED' && room.currentCheckIn && (
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">Check-in at</Text>
                    <Text size="xs" fw={500}>{dayjs(room.currentCheckIn).format('HH:mm - DD MMM')}</Text>
                  </Group>
                )}

                {room.status === 'OCCUPIED' && room.expectedCheckOut && (
                  <Group justify="space-between">
                    <Text size="xs" c={dayjs().isAfter(room.expectedCheckOut) ? 'red' : 'dimmed'}>Checkout at</Text>
                    <Text size="xs" fw={700} c={dayjs().isAfter(room.expectedCheckOut) ? 'red' : 'blue'}>
                      {dayjs(room.expectedCheckOut).format('HH:mm - DD MMM')}
                    </Text>
                  </Group>
                )}

                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Last Status Change</Text>
                  <Text size="sm" fw={600}>
                    {room.lastStatusChange ? dayjs(room.lastStatusChange).fromNow() : 'N/A'}
                  </Text>
                </Group>
              </Stack>

              <Button fullWidth variant="light" onClick={() => openManage(room)}>
                Manage Room
              </Button>
            </Card>
          ))}
        </SimpleGrid>
      )}

      <Modal
        opened={!!selected}
        onClose={closeManage}
        title={selected ? `Room ${selected.number} - Details & History` : 'Manage Room'}
        centered
        radius="lg"
        size="lg"
      >
        {selected && (
          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List mb="md">
              <Tabs.Tab value="manage" leftSection={<IconDoor size={14} />}>Update Status</Tabs.Tab>
              <Tabs.Tab value="history" leftSection={<IconRefresh size={14} />}>Movement History</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="manage">
              <Stack gap="md">
                <Paper withBorder radius="md" p="md">
                  <Group justify="space-between" mb={8}>
                    <Text fw={700}>Room {selected.number}</Text>
                    <Badge color={statusColor[selected.status]} variant="light" leftSection={statusIcon[selected.status]}>
                      {selected.status}
                    </Badge>
                  </Group>
                  <Text size="sm" c="dimmed">
                    {selected.type} {isAdmin && `· ${formatCurrency(selected.price)} per night`}
                  </Text>
                </Paper>

                <Select
                  label="Update Status"
                  value={newStatus}
                  onChange={(value) => setNewStatus(value || '')}
                  data={[
                    { value: 'AVAILABLE', label: 'AVAILABLE' },
                    { value: 'OCCUPIED', label: 'OCCUPIED (Check-in)' },
                    { value: 'CLEANING', label: 'CLEANING / TURNOVER' },
                    { value: 'RESERVED', label: 'RESERVED' },
                  ]}
                  allowDeselect={false}
                />

                {(newStatus === 'OCCUPIED' || newStatus === 'RESERVED') && (
                  <DatePickerInput
                    label="Expected Checkout / Stay Until"
                    placeholder="Pick date"
                    value={expectedCheckOut}
                    onChange={(val: any) => setExpectedCheckOut(val)}
                    clearable
                    leftSection={<IconCalendarEvent size={18} />}
                    minDate={new Date()}
                  />
                )}

                {selected.currentCheckIn && (
                  <Alert icon={<IconClock size={16} />} color="blue" variant="light" p="xs">
                    Check-in was recorded at {dayjs(selected.currentCheckIn).format('HH:mm - DD MMM YYYY')}
                  </Alert>
                )}

                <Group justify="flex-end">
                  <Button variant="default" onClick={closeManage} disabled={saving}>
                    Cancel
                  </Button>
                  <Button loading={saving} onClick={saveStatus}>
                    Save Changes
                  </Button>
                </Group>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="history">
              <Stack gap="xl">
                {historyLoading ? (
                  <Stack gap="sm">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} height={40} radius="md" />)}
                  </Stack>
                ) : history.length === 0 ? (
                  <Alert color="gray" variant="light">No movement history recorded yet.</Alert>
                ) : (
                  <div>
                    <Text fw={700} size="sm" mb="lg">Movement Timeline</Text>
                    <Timeline active={0} bulletSize={24} lineWidth={2}>
                      {history.map((h) => (
                        <Timeline.Item 
                          key={h.id} 
                          bullet={statusIcon[h.newStatus as RoomStatus]} 
                          color={statusColor[h.newStatus as RoomStatus]}
                          title={
                            <Group gap={8}>
                              <Text size="sm" fw={700}>{h.newStatus}</Text>
                              <Badge size="xs" variant="outline" color="gray">
                                from {h.oldStatus || 'NONE'}
                              </Badge>
                            </Group>
                          }
                        >
                          <Text size="xs" c="dimmed">{dayjs(h.createdAt).format('HH:mm - DD MMM YYYY')} ({dayjs(h.createdAt).fromNow()})</Text>
                          <Text size="sm" mt={4}>
                            Updated by <b>{h.user?.name}</b> <Badge size="xs" variant="dot" ml={4}>{h.user?.role}</Badge>
                          </Text>
                        </Timeline.Item>
                      ))}
                    </Timeline>
                  </div>
                )}

                <Divider label="Service & Billing (Room Orders)" labelPosition="center" />
                
                <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
                  <Text size="xs">
                    This section shows all kitchen, bar, and accommodation orders billed to <b>Room {selected.number}</b> during the current stay.
                  </Text>
                </Alert>

                <Paper withBorder radius="md" p="md">
                  <Text size="xs" ta="center" c="dimmed">
                    Detailed billing history is currently pulling from the <b>Finance Hub</b> based on the room number. 
                    Manage individual orders in the <b>Orders</b> section for full menu control.
                  </Text>
                </Paper>
              </Stack>
            </Tabs.Panel>
          </Tabs>
        )}
      </Modal>

      <Modal
        opened={addOpen}
        onClose={closeAddModal}
        title="Add New Room"
        centered
        radius="lg"
      >
        <Stack gap="md">
          <TextInput
            label="Room Number"
            placeholder="e.g. 105"
            value={addForm.number}
            onChange={(event) => {
              const val = event.target?.value || '';
              setAddForm((prev) => ({ ...prev, number: val }));
            }}
          />

          <Select
            label="Room Type"
            value={addForm.type}
            onChange={(value) => setAddForm((prev) => ({ ...prev, type: value || 'STANDARD' }))}
            data={roomTypes}
            allowDeselect={false}
          />

          <NumberInput
            label="Price per Night"
            placeholder="Enter room price"
            value={addForm.price}
            onChange={(value) => setAddForm((prev) => ({ ...prev, price: Number(value) || 0 }))}
            min={0}
            prefix="$"
            decimalScale={2}
            allowNegative={false}
          />

          <Group justify="flex-end">
            <Button variant="default" onClick={closeAddModal} disabled={adding}>
              Cancel
            </Button>
            <Button loading={adding} onClick={addRoom} leftSection={<IconPlus size={16} />}>
              Add Room
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Text size="xs" c="dimmed" ta="right">
        {autoRefresh ? 'Auto-refreshing every 20 seconds' : 'Auto-refresh is paused'}
      </Text>
    </Stack>
  );
}



