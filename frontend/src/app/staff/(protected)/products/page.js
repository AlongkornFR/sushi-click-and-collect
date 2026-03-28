"use client";

import { useEffect, useMemo, useState } from "react";
import { useStaffAuth } from "../../_components/useStaffAuth";
import ProductList from "../../_components/ProductList";
import ProductDrawer from "../../_components/ProductDrawer";

const emptyForm = {
  name: "",
  description: "",
  price: "",
  stock: 0,
  is_available: true,
  image_main: "",
  category_id: "",
  subcategory_id: "",
};

const PRODUCTS_PER_PAGE = 10;

export default function StaffProductsPage() {
  const { API, token, authFetch } = useStaffAuth();

  const [products, setProducts]           = useState([]);
  const [categories, setCategories]       = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  const [form, setForm]           = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const [newCategory, setNewCategory]                       = useState("");
  const [newSubCategory, setNewSubCategory]                 = useState("");
  const [newSubCategoryParentId, setNewSubCategoryParentId] = useState("");

  const [selectedCategory, setSelectedCategory]       = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [fetching, setFetching]       = useState(true);
  const [drawerOpen, setDrawerOpen]   = useState(false);

  /* ── Data fetchers ── */
  async function fetchProducts() {
    try {
      const res = await authFetch(`${API}/staff/products/`, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (e) { setError(String(e.message || e)); }
  }

  async function fetchCategories() {
    try {
      const res = await authFetch(`${API}/staff/categories/`, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (e) { setError(String(e.message || e)); }
  }

  async function fetchSubcategories(categoryId = "") {
    try {
      const url = categoryId
        ? `${API}/staff/subcategories/?category_id=${categoryId}`
        : `${API}/staff/subcategories/`;
      const res = await authFetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSubcategories(Array.isArray(data) ? data : []);
    } catch (e) { setError(String(e.message || e)); }
  }

  useEffect(() => {
    if (!token) return;
    Promise.all([fetchProducts(), fetchCategories(), fetchSubcategories()])
      .finally(() => setFetching(false));
  }, [token]);

  useEffect(() => { setCurrentPage(1); }, [selectedCategory, selectedSubCategory]);

  /* ── Form handlers ── */
  function onChange(e) {
    const { name, value, type, checked } = e.target;
    setForm(prev => {
      const updated = { ...prev, [name]: type === "checkbox" ? checked : value };
      if (name === "category_id") {
        updated.subcategory_id = "";
        fetchSubcategories(value);
      }
      return updated;
    });
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    fetchSubcategories();
    setDrawerOpen(true);
  }

  function openEdit(product) {
    const categoryId = product.category?.id ? String(product.category.id) : "";
    setEditingId(product.id);
    setForm({
      name: product.name || "",
      description: product.description || "",
      price: product.price || "",
      stock: product.stock ?? 0,
      is_available: !!product.is_available,
      image_main: product.image_main || "",
      category_id: categoryId,
      subcategory_id: product.subcategory?.id ? String(product.subcategory.id) : "",
    });
    if (categoryId) fetchSubcategories(categoryId);
    else fetchSubcategories();
    setError("");
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    fetchSubcategories();
  }

  async function saveProduct(e) {
    e.preventDefault();
    setError("");
    if (!form.category_id)    { setError("La catégorie est obligatoire.");      return; }
    if (!form.subcategory_id) { setError("La sous-catégorie est obligatoire."); return; }
    setLoading(true);
    try {
      const payload = {
        ...form,
        stock: Number(form.stock),
        category_id: Number(form.category_id),
        subcategory_id: Number(form.subcategory_id),
      };
      const url    = editingId ? `${API}/staff/products/${editingId}/` : `${API}/staff/products/create/`;
      const method = editingId ? "PATCH" : "POST";
      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchProducts();
      setCurrentPage(1);
      closeDrawer();
    } catch (e2) {
      setError(String(e2.message || e2));
    } finally {
      setLoading(false);
    }
  }

  async function createCategory(e) {
    e.preventDefault();
    if (!newCategory.trim()) return;
    try {
      const slug = newCategory.toLowerCase().normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");
      const res = await authFetch(`${API}/staff/categories/create/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategory.trim(), slug }),
      });
      if (!res.ok) throw new Error(await res.text());
      const created = await res.json();
      setNewCategory("");
      setNewSubCategoryParentId(String(created.id));
      await fetchCategories();
    } catch (e2) { setError(String(e2.message || e2)); }
  }

  async function createSubCategory(e) {
    e.preventDefault();
    if (!newSubCategoryParentId) { setError("Choisis une catégorie parente."); return; }
    if (!newSubCategory.trim()) return;
    try {
      const slug = newSubCategory.toLowerCase().normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");
      const res = await authFetch(`${API}/staff/subcategories/create/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSubCategory.trim(), slug, category_id: Number(newSubCategoryParentId) }),
      });
      if (!res.ok) throw new Error(await res.text());
      setNewSubCategory("");
      await fetchSubcategories();
    } catch (e2) { setError(String(e2.message || e2)); }
  }

  /* ── Derived data ── */
  const formSubcategories = useMemo(() =>
    !form.category_id ? [] :
    subcategories.filter(sc => String(sc.category?.id || sc.category_id) === String(form.category_id)),
  [subcategories, form.category_id]);

  const visibleSubcategories = useMemo(() =>
    !selectedCategory ? subcategories :
    subcategories.filter(sc => String(sc.category?.id || sc.category_id) === String(selectedCategory)),
  [subcategories, selectedCategory]);

  const filteredProducts = useMemo(() =>
    products.filter(p => {
      const matchCat = selectedCategory ? String(p.category?.id) === String(selectedCategory) : true;
      const matchSub = selectedSubCategory ? String(p.subcategory?.id) === String(selectedSubCategory) : true;
      return matchCat && matchSub;
    }),
  [products, selectedCategory, selectedSubCategory]);

  const totalPages        = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
  const safeCurrentPage   = Math.min(currentPage, totalPages);
  const paginatedProducts = useMemo(() => {
    const start = (safeCurrentPage - 1) * PRODUCTS_PER_PAGE;
    return filteredProducts.slice(start, start + PRODUCTS_PER_PAGE);
  }, [filteredProducts, safeCurrentPage]);

  /* ── Render ── */
  return (
    <>
      <ProductList
        fetching={fetching}
        products={products}
        filteredProducts={filteredProducts}
        paginatedProducts={paginatedProducts}
        categories={categories}
        visibleSubcategories={visibleSubcategories}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectedSubCategory={selectedSubCategory}
        setSelectedSubCategory={setSelectedSubCategory}
        totalPages={totalPages}
        currentPage={safeCurrentPage}
        onPageChange={setCurrentPage}
        onOpenCreate={openCreate}
        onOpenEdit={openEdit}
      />

      <ProductDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        editingId={editingId}
        form={form}
        setForm={setForm}
        onChange={onChange}
        onSubmit={saveProduct}
        loading={loading}
        error={error}
        categories={categories}
        formSubcategories={formSubcategories}
        newCategory={newCategory}
        setNewCategory={setNewCategory}
        newSubCategory={newSubCategory}
        setNewSubCategory={setNewSubCategory}
        newSubCategoryParentId={newSubCategoryParentId}
        setNewSubCategoryParentId={setNewSubCategoryParentId}
        onCreateCategory={createCategory}
        onCreateSubCategory={createSubCategory}
      />
    </>
  );
}
