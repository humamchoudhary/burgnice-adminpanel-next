"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Edit, AlertTriangle, LogOut, Upload } from "lucide-react";
import { isAuthenticated, logout } from "./lib/auth";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:5000/";

// Type definitions
interface Category {
  _id: string;
  name: string;
  description: string;
  promotion: boolean;
}

interface MenuEntry {
  _id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  categories: Category[] | string[];
  isAvailable?: boolean;
  isTopDeal: boolean;
}

interface Order {
  _id: string;
  status: string;
  total: number;
  user: any;
  createdAt: string;
}

interface Ingredient {
  _id: string;
  name: string;
  price: number;
  picture?: string;
}

interface ConfirmDelete {
  open: boolean;
  type: "category" | "menuItem" | "ingredient";
  id: string | null;
  name: string;
}

interface Snackbar {
  open: boolean;
  message: string;
  severity: "success" | "error";
}

export default function DashboardPage() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);

  // State for data
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuEntry[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  // Dialog states
  const [openCategory, setOpenCategory] = useState(false);
  const [openMenuItem, setOpenMenuItem] = useState(false);
  const [openIngredient, setOpenIngredient] = useState(false);

  // Current editing items
  const [currentCategory, setCurrentCategory] =
    useState<Partial<Category> | null>(null);
  const [currentMenuItem, setCurrentMenuItem] =
    useState<Partial<MenuEntry> | null>(null);
  const [currentIngredient, setCurrentIngredient] =
    useState<Partial<Ingredient> | null>(null);

  // Image files
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageIngredientFile, setImageIngredientFile] = useState<File | null>(
    null,
  );

  // Confirm delete
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDelete>({
    open: false,
    type: "category",
    id: null,
    name: "",
  });

  // Snackbar
  const [snackbar, setSnackbar] = useState<Snackbar>({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    setIsClient(true);
    console.log(isAuthenticated());
    if (!isAuthenticated()) {
      router.replace("/login");
    }
  }, [router]);

  // API helper with auth
  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem("adminToken");
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }

    return response.json();
  };

  // Fetch functions
  const fetchOrders = async () => {
    try {
      const data = await apiCall("/orders");
      setOrders(data);
    } catch (err) {
      console.error(err);
      setSnackbar({
        open: true,
        message: "Failed to fetch orders",
        severity: "error",
      });
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await apiCall("/categories");
      setCategories(data);
    } catch (err) {
      console.error(err);
      setSnackbar({
        open: true,
        message: "Failed to fetch categories",
        severity: "error",
      });
    }
  };

  const fetchMenuItems = async () => {
    try {
      const data = await apiCall("/menu-items");
      setMenuItems(data);
    } catch (err) {
      console.error(err);
      setSnackbar({
        open: true,
        message: "Failed to fetch menu items",
        severity: "error",
      });
    }
  };

  const fetchIngredients = async () => {
    try {
      const data = await apiCall("/ingredients");
      setIngredients(data);
    } catch (err) {
      console.error(err);
      setSnackbar({
        open: true,
        message: "Failed to fetch ingredients",
        severity: "error",
      });
    }
  };

  useEffect(() => {
    if (isClient && isAuthenticated()) {
      fetchOrders();
      fetchCategories();
      fetchMenuItems();
      fetchIngredients();
    }
  }, [isClient]);

  // Orders stats
  const totalOrders = orders.length;
  const completedOrders = orders.filter((o) => o.status === "completed").length;
  const pendingOrders = orders.filter((o) => o.status === "pending").length;

  // Category CRUD
  const handleCategorySave = async () => {
    try {
      const endpoint = currentCategory?._id
        ? `/categories/${currentCategory._id}`
        : "/categories";
      const method = currentCategory?._id ? "PUT" : "POST";

      await apiCall(endpoint, {
        method,
        body: JSON.stringify(currentCategory),
      });

      setOpenCategory(false);
      setCurrentCategory(null);
      fetchCategories();
      setSnackbar({
        open: true,
        message: "Category saved successfully",
        severity: "success",
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Failed to save category",
        severity: "error",
      });
      console.error(err);
    }
  };

  const handleCategoryDelete = async (id: string) => {
    try {
      await apiCall(`/categories/${id}`, { method: "DELETE" });
      fetchCategories();
      setSnackbar({
        open: true,
        message: "Category deleted",
        severity: "success",
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Failed to delete category",
        severity: "error",
      });
      console.error(err);
    }
  };

  // Menu item CRUD
  const handleMenuItemSave = async () => {
    try {
      const formData = new FormData();
      formData.append("name", currentMenuItem?.name || "");
      formData.append("description", currentMenuItem?.description || "");
      formData.append("price", (currentMenuItem?.price ?? 0).toString());

      formData.append(
        "isTopDeal",
        (currentMenuItem?.isTopDeal || false).toString(),
      );
      const categories = Array.isArray(currentMenuItem?.categories)
        ? currentMenuItem.categories
        : [];

      const categoryIds = categories.map((cat) =>
        typeof cat === "object" ? (cat as Category)._id : cat,
      );

      categoryIds.forEach((id, index) => {
        formData.append(`categories[${index}]`, id);
      });

      if (imageFile) {
        formData.append("image", imageFile);
      }

      const endpoint = currentMenuItem?._id
        ? `/menu-items/${currentMenuItem._id}`
        : "/menu-items";
      const method = currentMenuItem?._id ? "PUT" : "POST";

      const token = localStorage.getItem("adminToken");
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to save menu item");

      setOpenMenuItem(false);
      setCurrentMenuItem(null);
      setImageFile(null);
      fetchMenuItems();
      setSnackbar({
        open: true,
        message: "Menu item saved successfully",
        severity: "success",
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Failed to save menu item",
        severity: "error",
      });
      console.error(err);
    }
  };

  const handleMenuItemDelete = async (id: string) => {
    try {
      await apiCall(`/menu-items/${id}`, { method: "DELETE" });
      fetchMenuItems();
      setSnackbar({
        open: true,
        message: "Menu item deleted",
        severity: "success",
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Failed to delete menu item",
        severity: "error",
      });
      console.error(err);
    }
  };

  const handleMenuItemImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setCurrentMenuItem({
      ...currentMenuItem,
      image: URL.createObjectURL(file),
    });
  };

  // Ingredient CRUD
  const handleIngredientSave = async () => {
    try {
      const formData = new FormData();
      formData.append("name", currentIngredient?.name || "");
      formData.append("price", (currentIngredient?.price ?? 0).toString());
      if (imageIngredientFile) {
        formData.append("picture", imageIngredientFile);
      }

      const endpoint = currentIngredient?._id
        ? `/ingredients/${currentIngredient._id}`
        : "/ingredients";
      const method = currentIngredient?._id ? "POST" : "POST";

      const token = localStorage.getItem("adminToken");
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to save ingredient");

      setOpenIngredient(false);
      setCurrentIngredient(null);
      setImageIngredientFile(null);
      fetchIngredients();
      setSnackbar({
        open: true,
        message: "Ingredient saved successfully",
        severity: "success",
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Failed to save ingredient",
        severity: "error",
      });
      console.error(err);
    }
  };

  const handleIngredientDelete = async (id: string) => {
    try {
      await apiCall(`/ingredients/${id}`, { method: "DELETE" });
      fetchIngredients();
      setSnackbar({
        open: true,
        message: "Ingredient deleted",
        severity: "success",
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Failed to delete ingredient",
        severity: "error",
      });
      console.error(err);
    }
  };

  const handleIngredientImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageIngredientFile(file);
    setCurrentIngredient({
      ...currentIngredient,
      picture: URL.createObjectURL(file),
    });
  };

  // Order status change
  const handleOrderStatusChange = async (
    orderId: string,
    newStatus: string,
  ) => {
    try {
      await apiCall(`/orders/${orderId}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      fetchOrders();
      setSnackbar({
        open: true,
        message: `Order ${newStatus}`,
        severity: "success",
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Failed to update order",
        severity: "error",
      });
      console.error(err);
    }
  };

  // Helper functions
  const getCategorySelectValue = (): string[] => {
    if (!currentMenuItem?.categories) return [];

    const categories = currentMenuItem.categories;

    // If it's already an array of strings
    if (Array.isArray(categories) && categories.length > 0) {
      if (typeof categories[0] === "string") {
        return categories as string[];
      }
      // If it's an array of objects with _id property
      if (typeof categories[0] === "object" && categories[0] !== null) {
        return (categories as Category[])
          .map((cat) => cat._id || (cat as any).id || String(cat))
          .filter(Boolean);
      }
    }

    // If it's a single string
    if (typeof categories === "string") {
      return [categories];
    }

    return [];
  };

  const openConfirmDeleteDialog = (
    type: "category" | "menuItem" | "ingredient",
    id: string,
    name: string,
  ) => {
    setConfirmDelete({ open: true, type, id, name });
  };

  const onConfirmDelete = async () => {
    if (confirmDelete.id) {
      if (confirmDelete.type === "category") {
        await handleCategoryDelete(confirmDelete.id);
      } else if (confirmDelete.type === "menuItem") {
        await handleMenuItemDelete(confirmDelete.id);
      } else if (confirmDelete.type === "ingredient") {
        await handleIngredientDelete(confirmDelete.id);
      }
      setConfirmDelete({ ...confirmDelete, open: false, id: null, name: "" });
    }
  };

  const onCancelDelete = () => {
    setConfirmDelete({ ...confirmDelete, open: false, id: null, name: "" });
  };

  const handleLogoutClick = () => {
    logout();
    router.replace("/login");
  };

  if (!isClient) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-primary-600">
            Admin Dashboard
          </h1>
          <button
            onClick={handleLogoutClick}
            className="flex items-center gap-2 px-4 py-2 border-2 border-primary-600 text-primary-600 rounded-xl hover:bg-primary-50 transition-colors font-semibold"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {[
            "Overview",
            "Categories",
            "Menu Items",
            "Ingredients",
            "Orders",
          ].map((tab, index) => (
            <button
              key={tab}
              onClick={() => setTabIndex(index)}
              className={`px-6 py-3 rounded-xl font-semibold whitespace-nowrap transition-colors ${
                tabIndex === index
                  ? "bg-primary-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {tabIndex === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-primary-100 rounded-2xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Total Orders
              </h3>
              <p className="text-4xl font-bold text-primary-600">
                {totalOrders}
              </p>
            </div>
            <div className="bg-orange-100 rounded-2xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Pending Orders
              </h3>
              <p className="text-4xl font-bold text-orange-600">
                {pendingOrders}
              </p>
            </div>
            <div className="bg-primary-200 rounded-2xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Completed Orders
              </h3>
              <p className="text-4xl font-bold text-primary-700">
                {completedOrders}
              </p>
            </div>
          </div>
        )}

        {/* Categories Tab */}
        {tabIndex === 1 && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-primary-600">
                Categories
              </h2>
              <button
                onClick={() => {
                  setOpenCategory(true);
                  setCurrentCategory({});
                }}
                className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-semibold"
              >
                Add Category
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-primary-600 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left font-bold">Name</th>
                    <th className="px-6 py-4 text-left font-bold">
                      Description
                    </th>
                    <th className="px-6 py-4 text-right font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr
                      key={category._id}
                      className="border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="px-6 py-4">{category.name}</td>
                      <td className="px-6 py-4">{category.description}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setOpenCategory(true);
                            setCurrentCategory(category);
                          }}
                          className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg mr-2"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() =>
                            openConfirmDeleteDialog(
                              "category",
                              category._id,
                              category.name,
                            )
                          }
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Menu Items Tab */}
        {tabIndex === 2 && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-primary-600">
                Menu Items
              </h2>
              <button
                onClick={() => {
                  setOpenMenuItem(true);
                  setCurrentMenuItem({ categories: [] });
                }}
                className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-semibold"
              >
                Add Menu Item
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-primary-600 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left font-bold">Name</th>
                    <th className="px-6 py-4 text-left font-bold">
                      Categories
                    </th>
                    <th className="px-6 py-4 text-left font-bold">Price</th>
                    <th className="px-6 py-4 text-right font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {menuItems.map((item) => (
                    <tr
                      key={item._id}
                      className="border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="px-6 py-4">{item.name}</td>
                      <td className="px-6 py-4">
                        {Array.isArray(item.categories)
                          ? item.categories
                              .map((cat) =>
                                typeof cat === "object" && cat !== null
                                  ? cat.name
                                  : String(cat),
                              )
                              .join(", ")
                          : String(item.categories || "")}
                      </td>
                      <td className="px-6 py-4">${item.price.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setOpenMenuItem(true);
                            setCurrentMenuItem(item);
                          }}
                          className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg mr-2"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() =>
                            openConfirmDeleteDialog(
                              "menuItem",
                              item._id,
                              item.name,
                            )
                          }
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Ingredients Tab */}
        {tabIndex === 3 && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-primary-600">
                Ingredients
              </h2>
              <button
                onClick={() => {
                  setOpenIngredient(true);
                  setCurrentIngredient({});
                }}
                className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-semibold"
              >
                Add Ingredient
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-primary-600 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left font-bold">Name</th>
                    <th className="px-6 py-4 text-left font-bold">Price</th>
                    <th className="px-6 py-4 text-left font-bold">Picture</th>
                    <th className="px-6 py-4 text-right font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ingredients.map((ingredient) => (
                    <tr
                      key={ingredient._id}
                      className="border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="px-6 py-4">{ingredient.name}</td>
                      <td className="px-6 py-4">
                        ${ingredient.price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        {ingredient.picture && (
                          <img
                            src={`${BASE_URL}${ingredient.picture}`}
                            alt={ingredient.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setOpenIngredient(true);
                            setCurrentIngredient(ingredient);
                          }}
                          className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg mr-2"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() =>
                            openConfirmDeleteDialog(
                              "ingredient",
                              ingredient._id,
                              ingredient.name,
                            )
                          }
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {tabIndex === 4 && (
          <div>
            <h2 className="text-2xl font-bold text-primary-600 mb-6">Orders</h2>
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-primary-600 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left font-bold">Order ID</th>
                    <th className="px-6 py-4 text-left font-bold">User</th>
                    <th className="px-6 py-4 text-left font-bold">Total</th>
                    <th className="px-6 py-4 text-left font-bold">Status</th>
                    <th className="px-6 py-4 text-left font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr
                      key={order._id}
                      className="border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="px-6 py-4">{order._id}</td>
                      <td className="px-6 py-4">{order.user?.name || "N/A"}</td>
                      <td className="px-6 py-4">${order.total.toFixed(2)}</td>
                      <td className="px-6 py-4">{order.status}</td>
                      <td className="px-6 py-4">
                        {order.status === "pending" && (
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                handleOrderStatusChange(order._id, "accepted")
                              }
                              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-semibold"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() =>
                                handleOrderStatusChange(order._id, "rejected")
                              }
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-semibold"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {order.status === "accepted" && (
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                handleOrderStatusChange(order._id, "completed")
                              }
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold"
                            >
                              Complete
                            </button>
                            <button
                              onClick={() =>
                                handleOrderStatusChange(order._id, "rejected")
                              }
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-semibold"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                        {["completed", "rejected"].includes(order.status) && (
                          <span className="text-sm text-gray-600">
                            {order.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Category Dialog */}
        {openCategory && (
          <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {currentCategory?._id ? "Edit Category" : "Add Category"}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={currentCategory?.name || ""}
                    onChange={(e) =>
                      setCurrentCategory({
                        ...currentCategory,
                        name: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={currentCategory?.description || ""}
                    onChange={(e) =>
                      setCurrentCategory({
                        ...currentCategory,
                        description: e.target.value,
                      })
                    }
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={currentCategory?.promotion || false}
                    onChange={(e) =>
                      setCurrentCategory({
                        ...currentCategory,
                        promotion: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Show in Promotion Grid
                  </label>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setOpenCategory(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCategorySave}
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-semibold"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Menu Item Dialog */}
        {openMenuItem && (
          <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full my-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {currentMenuItem?._id ? "Edit Menu Item" : "Add Menu Item"}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={currentMenuItem?.name || ""}
                    onChange={(e) =>
                      setCurrentMenuItem({
                        ...currentMenuItem,
                        name: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={currentMenuItem?.description || ""}
                    onChange={(e) =>
                      setCurrentMenuItem({
                        ...currentMenuItem,
                        description: e.target.value,
                      })
                    }
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      currentMenuItem?.price !== undefined
                        ? currentMenuItem.price
                        : ""
                    }
                    onChange={(e) =>
                      setCurrentMenuItem({
                        ...currentMenuItem,
                        price: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categories
                  </label>
                  <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-300 rounded-xl p-2">
                    {categories.map((cat) => {
                      const isSelected = getCategorySelectValue().includes(
                        cat._id,
                      );
                      return (
                        <div
                          key={cat._id}
                          onClick={() => {
                            const currentValues = getCategorySelectValue();
                            let newCategories;

                            if (isSelected) {
                              // Remove if already selected
                              newCategories = currentValues.filter(
                                (id) => id !== cat._id,
                              );
                            } else {
                              // Add if not selected
                              newCategories = [...currentValues, cat._id];
                            }

                            setCurrentMenuItem({
                              ...currentMenuItem,
                              categories: newCategories,
                            });
                          }}
                          className={`px-4 py-3 rounded-lg cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-primary-100 text-primary-700 border border-primary-300"
                              : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          <div className="flex items-center">
                            <div
                              className={`w-4 h-4 border rounded mr-3 flex items-center justify-center ${
                                isSelected
                                  ? "bg-primary-600 border-primary-600"
                                  : "border-gray-400"
                              }`}
                            >
                              {isSelected && (
                                <svg
                                  className="w-3 h-3 text-white"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="3"
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              )}
                            </div>
                            <span className="font-medium">{cat.name}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleMenuItemImage}
                    id="menu-image-upload"
                    className="hidden"
                  />
                  <label htmlFor="menu-image-upload">
                    <button
                      type="button"
                      onClick={() =>
                        document.getElementById("menu-image-upload")?.click()
                      }
                      className="flex items-center gap-2 px-4 py-3 border border-primary-600 text-primary-600 rounded-xl hover:bg-primary-50 font-semibold"
                    >
                      <Upload className="w-4 h-4" />
                      {currentMenuItem?.image ? "Change Image" : "Upload Image"}
                    </button>
                  </label>
                  {currentMenuItem?.image && (
                    <div className="mt-4">
                      <img
                        src={`${BASE_URL}${currentMenuItem.image}`}
                        alt="Preview"
                        className="w-24 h-24 rounded-lg object-cover shadow-md"
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="top-deal"
                  checked={currentMenuItem?.isTopDeal || false}
                  onChange={(e) =>
                    setCurrentMenuItem({
                      ...currentMenuItem,
                      isTopDeal: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label
                  htmlFor="top-deal"
                  className="ml-2 text-sm text-gray-700"
                >
                  Mark as Top Deal
                </label>
              </div>{" "}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setOpenMenuItem(false);
                    setImageFile(null);
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMenuItemSave}
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-semibold"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Ingredient Dialog */}
        {openIngredient && (
          <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {currentIngredient?._id ? "Edit Ingredient" : "Add Ingredient"}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={currentIngredient?.name || ""}
                    onChange={(e) =>
                      setCurrentIngredient({
                        ...currentIngredient,
                        name: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      currentIngredient?.price !== undefined
                        ? currentIngredient.price
                        : ""
                    }
                    onChange={(e) =>
                      setCurrentIngredient({
                        ...currentIngredient,
                        price: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleIngredientImage}
                    id="ingredient-image-upload"
                    className="hidden"
                  />
                  <label htmlFor="ingredient-image-upload">
                    <button
                      type="button"
                      onClick={() =>
                        document
                          .getElementById("ingredient-image-upload")
                          ?.click()
                      }
                      className="flex items-center gap-2 px-4 py-3 border border-primary-600 text-primary-600 rounded-xl hover:bg-primary-50 font-semibold"
                    >
                      <Upload className="w-4 h-4" />
                      {currentIngredient?.picture
                        ? "Change Picture"
                        : "Upload Picture"}
                    </button>
                  </label>
                  {currentIngredient?.picture && (
                    <div className="mt-4">
                      <img
                        src={`${BASE_URL}${currentIngredient.picture}`}
                        alt="Preview"
                        className="w-24 h-24 rounded-lg object-cover shadow-md"
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setOpenIngredient(false);
                    setImageIngredientFile(null);
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleIngredientSave}
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-semibold"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm Delete Dialog */}
        {confirmDelete.open && (
          <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full">
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <AlertTriangle className="w-6 h-6" />
                <h2 className="text-2xl font-bold">Confirm Delete</h2>
              </div>
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete{" "}
                <strong>{confirmDelete.name}</strong>?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={onCancelDelete}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirmDelete}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Snackbar Notification */}
        {snackbar.open && (
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
            <div
              className={`px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 ${
                snackbar.severity === "success"
                  ? "bg-green-600 text-white"
                  : "bg-red-600 text-white"
              }`}
            >
              <span className="font-semibold">{snackbar.message}</span>
              <button
                onClick={() => setSnackbar({ ...snackbar, open: false })}
                className="ml-4 text-white hover:text-gray-200"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
