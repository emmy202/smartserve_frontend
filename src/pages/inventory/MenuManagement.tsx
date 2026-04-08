import { useEffect, useState, useCallback } from 'react';
import {
  Title,
  Text,
  Stack,
  Group,
  Button,
  Table,
  Badge,
  ActionIcon,
  Modal,
  TextInput,
  NumberInput,
  Select,
  Paper,
  Divider,
  ThemeIcon,
  Tooltip,
  Grid,
  ScrollArea,
} from '@mantine/core';
import {
  IconPlus,
  IconTrash,
  IconEdit,
  IconTools,
  IconToolsKitchen2,
  IconCheck,
  IconX,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import api from '../../lib/api';

interface InventoryItem {
  id: number;
  name: string;
  unit: string;
}

interface MenuItem {
  id: number;
  name: string;
  price: number;
  type: string;
  category: { id: number; name: string };
  available: boolean;
}

interface Category {
  id: number;
  name: string;
}

interface RecipeItem {
  id: number;
  inventoryItemId: number;
  quantityNeeded: number;
  inventoryItem: InventoryItem;
}

export default function MenuManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

  // Modals
  const [itemModalOpened, setItemModalOpened] = useState(false);
  const [recipeModalOpened, setRecipeModalOpened] = useState(false);
  const [categoryModalOpened, setCategoryModalOpened] = useState(false);

  // Forms
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [recipe, setRecipe] = useState<RecipeItem[]>([]);
  const [newCatName, setNewCatName] = useState('');
  
  const [itemForm, setItemForm] = useState({
    name: '',
    price: 0,
    type: 'FOOD',
    categoryId: '' as string,
  });

  const [recipeForm, setRecipeForm] = useState({
    inventoryItemId: '' as string,
    quantityNeeded: 0,
  });

  const fetchData = useCallback(async () => {
    try {
      const [catRes, itemRes, invRes] = await Promise.all([
        api.get('/menu/category'),
        api.get('/menu/item'),
        api.get('/inventory/items'),
      ]);
      setCategories(catRes.data);
      setMenuItems(itemRes.data);
      setInventoryItems(invRes.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateCategory = async () => {
    if (!newCatName) return;
    try {
      await api.post('/menu/category', { name: newCatName });
      notifications.show({
        title: 'Category Created',
        message: `${newCatName} added to the menu system.`,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
      setNewCatName('');
      setCategoryModalOpened(false);
      fetchData();
    } catch (err: any) { 
      notifications.show({
        title: 'Error',
        message: 'Failed to create menu category.',
        color: 'red',
        icon: <IconX size={16} />,
      });
    }
  };

  const handleCreateItem = async () => {
    try {
      await api.post('/menu/item', { 
        ...itemForm, 
        categoryId: +itemForm.categoryId 
      });
      notifications.show({
        title: 'Item Created',
        message: `${itemForm.name} is now available on the menu.`,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
      setItemModalOpened(false);
      fetchData();
    } catch (err: any) { 
      notifications.show({
        title: 'Error',
        message: 'Failed to create menu item.',
        color: 'red',
        icon: <IconX size={16} />,
      });
    }
  };

  const openRecipe = async (item: MenuItem) => {
    setSelectedItem(item);
    try {
      const res = await api.get(`/menu/item/${item.id}/recipe`);
      setRecipe(res.data);
      setRecipeModalOpened(true);
    } catch (err) { console.error(err); }
  };

  const handleAddRecipeItem = async () => {
    if (!selectedItem || !recipeForm.inventoryItemId) return;
    try {
      await api.post(`/menu/item/${selectedItem.id}/recipe`, {
        inventoryItemId: +recipeForm.inventoryItemId,
        quantityNeeded: recipeForm.quantityNeeded
      });
      setRecipeForm({ inventoryItemId: '', quantityNeeded: 0 });
      // Refresh recipe
      const res = await api.get(`/menu/item/${selectedItem.id}/recipe`);
      setRecipe(res.data);
    } catch (err) { console.error(err); }
  };

  const handleDeleteItem = async (item: MenuItem) => {
    modals.openConfirmModal({
      title: 'Delete Menu Item',
      children: (
        <Text size="sm">
          Are you sure you want to delete <b>{item.name}</b>? This will remove the item and all its recipe links.
        </Text>
      ),
      labels: { confirm: 'Delete Item', cancel: 'Keep Item' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await api.delete(`/menu/item/${item.id}`);
          notifications.show({
            title: 'Item Deleted',
            message: `${item.name} removed from offerings.`,
            color: 'blue',
            icon: <IconTrash size={16} />,
          });
          fetchData();
        } catch (err: any) {
          console.error(err);
          notifications.show({
            title: 'Deletion Failed',
            message: err.response?.data?.message || 'Cannot delete used item. Deactivate it instead.',
            color: 'red',
            icon: <IconX size={16} />,
          });
        }
      },
    });
  };

  const handleToggleActive = async (item: MenuItem) => {
    const nextAvailable = !item.available;
    modals.openConfirmModal({
      title: nextAvailable ? 'Activate Item' : 'Deactivate Item',
      children: (
        <Text size="sm">
          Are you sure you want to {nextAvailable ? 'activate' : 'deactivate'} <b>{item.name}</b>?
          {nextAvailable ? ' Customers can order this item again.' : ' This item will be hidden from new orders.'}
        </Text>
      ),
      labels: { confirm: nextAvailable ? 'Activate' : 'Deactivate', cancel: 'Cancel' },
      confirmProps: { color: nextAvailable ? 'teal' : 'red' },
      onConfirm: async () => {
        try {
          await api.put(`/menu/item/${item.id}`, { ...item, available: nextAvailable });
          fetchData();
        } catch (err) { console.error(err); }
      },
    });
  };

  const handleRemoveRecipeItem = async (recipeId: number) => {
    modals.openConfirmModal({
      title: 'Remove Ingredient',
      children: (
        <Text size="sm">
          Remove this component from the recipe? This will affect stock calculations for all future sales.
        </Text>
      ),
      labels: { confirm: 'Remove', cancel: 'Keep' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await api.delete(`/menu/recipe/${recipeId}`);
          if (selectedItem) {
            const res = await api.get(`/menu/item/${selectedItem.id}/recipe`);
            setRecipe(res.data);
          }
        } catch (err) { console.error(err); }
      },
    });
  };

  return (
    <Stack gap="xl">
      <Group justify="space-between">
        <div>
          <Title order={3}>Sale Offerings & Recipes</Title>
          <Text size="sm" c="dimmed">Link your menu items to inventory materials for automated stock control.</Text>
        </div>
        <Group>
          <Button variant="light" leftSection={<IconPlus size={16} />} onClick={() => setCategoryModalOpened(true)}>New Category</Button>
          <Button leftSection={<IconPlus size={16} />} onClick={() => setItemModalOpened(true)}>New Menu Item</Button>
        </Group>
      </Group>

      <Paper withBorder radius="lg" p="md">
        <ScrollArea>
          <Table verticalSpacing="md" highlightOnHover style={{ minWidth: 900 }}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Menu Item</Table.Th>
                <Table.Th>Category</Table.Th>
                <Table.Th>Price</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Recipe Complexity</Table.Th>
                <Table.Th ta="right">Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {menuItems.map((item) => (
                <Table.Tr key={item.id}>
                  <Table.Td>
                    <Group gap="sm" wrap="nowrap">
                      <IconToolsKitchen2 size={16} color="var(--mantine-color-blue-filled)" />
                      <Text fw={700}>{item.name}</Text>
                      <Badge size="xs" color={item.type === 'FOOD' ? 'orange' : 'cyan'}>{item.type}</Badge>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="dot" color="gray">{item.category?.name || 'Uncategorized'}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text fw={800}>RWF {new Intl.NumberFormat().format(item.price)}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant={item.available ? 'filled' : 'light'} color={item.available ? 'teal' : 'gray'}>
                      {item.available ? 'ACTIVE' : 'DEACTIVATED'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Button variant="subtle" size="compact-xs" leftSection={<IconTools size={14} />} onClick={() => openRecipe(item)}>
                      Configure Recipe ({inventoryItems.length > 0 ? 'Link' : 'None'})
                    </Button>
                  </Table.Td>
                  <Table.Td ta="right">
                    <Group gap={8} justify="flex-end" wrap="nowrap">
                      <Tooltip label={item.available ? 'Deactivate' : 'Activate'}>
                        <ActionIcon variant="light" color={item.available ? 'orange' : 'teal'} onClick={() => handleToggleActive(item)}>
                          <IconEdit size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <ActionIcon variant="light" color="red" onClick={() => handleDeleteItem(item)}>
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Paper>

      {/* Item Modal */}
      <Modal opened={itemModalOpened} onClose={() => setItemModalOpened(false)} title="Create Menu Item" centered radius="lg">
        <Stack gap="md">
          <TextInput label="Item Name" placeholder="e.g. Cheese Burger" required value={itemForm.name} onChange={(e) => setItemForm(f => ({...f, name: e.target.value}))} />
          <NumberInput label="Price (RWF)" value={itemForm.price} onChange={(val) => setItemForm(f => ({...f, price: +val}))} />
          <Group grow>
            <Select label="Type" data={['FOOD', 'DRINK', 'ROOM_SERVICE']} value={itemForm.type} onChange={(val) => setItemForm(f => ({...f, type: val || 'FOOD'}))} />
            <Select label="Category" data={categories.map(c => ({ value: c.id.toString(), label: c.name }))} value={itemForm.categoryId} onChange={(val) => setItemForm(f => ({...f, categoryId: val || ''}))} />
          </Group>
          <Button fullWidth size="lg" mt="md" onClick={handleCreateItem}>Create Item</Button>
        </Stack>
      </Modal>

      {/* Category Modal */}
      <Modal opened={categoryModalOpened} onClose={() => setCategoryModalOpened(false)} title="Create Category" centered radius="lg">
        <Stack gap="md">
          <TextInput label="Category Name" placeholder="e.g. Main Course" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} />
          <Button fullWidth onClick={handleCreateCategory}>Create Category</Button>
        </Stack>
      </Modal>

      {/* Recipe Modal */}
      <Modal opened={recipeModalOpened} onClose={() => setRecipeModalOpened(false)} title={<Title order={4}>Link Recipe: {selectedItem?.name}</Title>} size="lg" centered radius="lg">
        <Stack gap="md">
          <Text size="sm" c="dimmed">Specify which raw materials are consumed when this item is sold.</Text>
          
          <Paper withBorder p="md" radius="md" bg="gray.0">
            <Grid align="flex-end">
              <Grid.Col span={6}>
                <Select 
                  label="Inventory Item" 
                  placeholder="Select material"
                  data={inventoryItems.map(i => ({ value: i.id.toString(), label: `${i.name} (${i.unit})` }))}
                  value={recipeForm.inventoryItemId}
                  onChange={(val) => setRecipeForm(f => ({...f, inventoryItemId: val || ''}))}
                  searchable
                />
              </Grid.Col>
              <Grid.Col span={4}>
                <NumberInput 
                  label="Qty Needed" 
                  placeholder="Usage/unit"
                  value={recipeForm.quantityNeeded}
                  onChange={(val) => setRecipeForm(f => ({...f, quantityNeeded: +val}))}
                  decimalScale={3}
                />
              </Grid.Col>
              <Grid.Col span={2}>
                <Button fullWidth onClick={handleAddRecipeItem} leftSection={<IconPlus size={14} />}>Add</Button>
              </Grid.Col>
            </Grid>
          </Paper>

          <Divider label="Current Components" labelPosition="center" />

          <Stack gap="xs">
            {recipe.map((r) => (
              <Paper key={r.id} withBorder p="xs" radius="md">
                <Group justify="space-between">
                  <Group gap="sm">
                    <ThemeIcon color="teal" variant="light" size="sm"><IconCheck size={12} /></ThemeIcon>
                    <div>
                      <Text size="sm" fw={700}>{r.inventoryItem.name}</Text>
                      <Text size="xs" c="dimmed">Consumes {r.quantityNeeded} {r.inventoryItem.unit} per sale</Text>
                    </div>
                  </Group>
                  <ActionIcon color="red" variant="subtle" onClick={() => handleRemoveRecipeItem(r.id)}>
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Paper>
            ))}
            {recipe.length === 0 && <Text ta="center" size="sm" c="dimmed" py="md">No recipe defined yet.</Text>}
          </Stack>
          
          <Button fullWidth mt="md" variant="light" onClick={() => setRecipeModalOpened(false)}>Finish</Button>
        </Stack>
      </Modal>
    </Stack>
  );
}
