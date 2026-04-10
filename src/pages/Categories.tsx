import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Text,
  Tabs,
  Table,
  Group,
  Button,
  ActionIcon,
  Modal,
  TextInput,
  Stack,
  Loader,
  Badge,
  ThemeIcon,
  Paper,
  Alert,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconEdit, IconTrash, IconTags, IconBox, IconBusinessplan, IconToolsKitchen2, IconBed, IconClipboardList, IconAlertCircle } from '@tabler/icons-react';
import api from '../lib/api';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';

type CategoryType = 'MENU' | 'INVENTORY' | 'EXPENSE' | 'ASSET' | 'ROOM';

interface Category {
  id: number;
  name: string;
  type: CategoryType;
  _count?: {
    menuItems?: number;
    inventoryItems?: number;
    expenses?: number;
    assets?: number;
    rooms?: number;
  };
}

export default function Categories() {
  const [activeTab, setActiveTab] = useState<string | null>('MENU');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [opened, { open, close }] = useDisclosure(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get('/categories', { params: { type: activeTab } });
      setCategories(res.data || []);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to fetch categories',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [activeTab]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    modals.openConfirmModal({
      title: editingCategory ? 'Confirm Update' : 'Confirm Creation',
      children: (
        <Text size="sm">
          Are you sure you want to {editingCategory ? 'update' : 'create'} the category <b>"{name}"</b> for <b>{activeTab}</b>?
        </Text>
      ),
      labels: { confirm: editingCategory ? 'Update' : 'Create', cancel: 'Cancel' },
      confirmProps: { color: 'blue' },
      onConfirm: async () => {
        try {
          if (editingCategory) {
            await api.put(`/categories/${editingCategory.id}`, { name });
            notifications.show({ message: 'Category updated successfully', color: 'green' });
          } else {
            await api.post('/categories', { name, type: activeTab });
            notifications.show({ message: 'Category created successfully', color: 'green' });
          }
          setName('');
          setEditingCategory(null);
          close();
          fetchCategories();
        } catch (error) {
          notifications.show({ title: 'Error', message: 'Operation failed', color: 'red' });
        }
      },
    });
  };

  const handleDelete = (id: number) => {
    const cat = categories.find(c => c.id === id);
    const usageCount = cat ? getCount(cat) : 0;

    modals.openConfirmModal({
      title: 'Confirm Deletion',
      children: (
        <Stack gap="sm">
          <Text size="sm">Are you sure you want to delete the category <b>"{cat?.name}"</b>?</Text>
          {usageCount > 0 && (
            <Alert color="red" icon={<IconAlertCircle size={16} />} radius="md">
              <Text size="xs">This category has <b>{usageCount}</b> items linked to it. Deletion may fail or cause data inconsistency.</Text>
            </Alert>
          )}
        </Stack>
      ),
      labels: { confirm: 'Delete Category', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await api.delete(`/categories/${id}`);
          notifications.show({ message: 'Category deleted', color: 'green' });
          fetchCategories();
        } catch (error) {
          notifications.show({ 
            title: 'Error', 
            message: 'Cannot delete category in use', 
            color: 'red' 
          });
        }
      },
    });
  };

  const openEdit = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    open();
  };

  const getCount = (cat: Category) => {
    switch (cat.type) {
      case 'MENU': return cat._count?.menuItems || 0;
      case 'INVENTORY': return cat._count?.inventoryItems || 0;
      case 'EXPENSE': return cat._count?.expenses || 0;
      case 'ASSET': return cat._count?.assets || 0;
      case 'ROOM': return cat._count?.rooms || 0;
      default: return 0;
    }
  };

  return (
    <Container size="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-end">
          <div>
            <Title order={1} fw={900} size={38} style={{ letterSpacing: '-1px' }}>
              Category Management
            </Title>
            <Text c="dimmed" size="lg"> Define and organize dynamic tags for all business modules </Text>
          </div>
          <Button 
            leftSection={<IconPlus size={18} />} 
            size="md" 
            radius="md" 
            onClick={() => { setEditingCategory(null); setName(''); open(); }}
          >
            Add Category
          </Button>
        </Group>

        <Paper radius="lg" p="md" withBorder shadow="sm" style={{ background: 'white' }}>
          <Tabs value={activeTab} onChange={setActiveTab} variant="pills" radius="lg">
            <Tabs.List grow>
              <Tabs.Tab value="MENU" leftSection={<IconToolsKitchen2 size={16} />}>Menu Categories</Tabs.Tab>
              <Tabs.Tab value="INVENTORY" leftSection={<IconBox size={16} />}>Inventory Types</Tabs.Tab>
              <Tabs.Tab value="EXPENSE" leftSection={<IconBusinessplan size={16} />}>Expense Centers</Tabs.Tab>
              <Tabs.Tab value="ASSET" leftSection={<IconClipboardList size={16} />}>Asset Groups</Tabs.Tab>
              <Tabs.Tab value="ROOM" leftSection={<IconBed size={16} />}>Room Types</Tabs.Tab>
            </Tabs.List>

            <div style={{ marginTop: '20px' }}>
              {loading ? (
                <Group justify="center" p="xl"><Loader /></Group>
              ) : (
                <Table.ScrollContainer minWidth={600}>
                  <Table verticalSpacing="md">
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Category Name</Table.Th>
                        <Table.Th>Usage Count</Table.Th>
                        <Table.Th align="right">Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {categories.map((cat) => (
                        <Table.Tr key={cat.id}>
                          <Table.Td>
                            <Group gap="sm">
                              <ThemeIcon variant="light" size="md" radius="md">
                                <IconTags size={14} />
                              </ThemeIcon>
                              <Text fw={600}>{cat.name}</Text>
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <Badge variant="dot" color={getCount(cat) > 0 ? 'blue' : 'gray'}>
                              {getCount(cat)} items linked
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Group gap={4} justify="flex-end">
                              <ActionIcon variant="subtle" color="blue" onClick={() => openEdit(cat)}>
                                <IconEdit size={16} />
                              </ActionIcon>
                              <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(cat.id)}>
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                      {categories.length === 0 && (
                        <Table.Tr>
                          <Table.Td colSpan={3}>
                            <Text ta="center" c="dimmed" p="xl">No categories found for this type</Text>
                          </Table.Td>
                        </Table.Tr>
                      )}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              )}
            </div>
          </Tabs>
        </Paper>
      </Stack>

      <Modal 
        opened={opened} 
        onClose={close} 
        title={<Text fw={700}>{editingCategory ? 'Edit Category' : 'New Category'}</Text>}
        radius="lg"
      >
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <TextInput
              label="Category Name"
              placeholder="e.g. Beverages, Electronics, Office Supplies..."
              required
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              autoFocus
            />
            <Text size="xs" c="dimmed">
              This category will be available in the <b>{activeTab}</b> module forms.
            </Text>
            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={close}>Cancel</Button>
              <Button type="submit">Save Category</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Container>
  );
}
