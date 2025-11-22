import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

export default function ExpenseScreen() {
  const db = useSQLiteContext();

  const [expenses, setExpenses] = useState([]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [filter, setFilter] = useState("all");

  const [totalSpending, setTotalSpending] = useState(0);
  const [categoryTotals, setCategoryTotals] = useState({});

  const [editingID, setEditingID] = useState(null);

const loadExpenses = async () => {
  const rows = await db.getAllAsync(
    'SELECT * FROM expenses ORDER BY id DESC;'
  );

  if (filter === "all") {
    setExpenses(rows);
    updateTotals(rows);
    return;
  }

  const now = new Date();
  let startDate = null;

  if (filter === "week") {
    const startOfWeek = new Date(now);
    const day = now.getDay();
    startOfWeek.setDate(now.getDate() - day);
    startDate = startOfWeek;
  }

  if (filter === "month") {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startDate = startOfMonth;
  }

  const filtered = rows.filter((e) => {
    if (!e.date) return true;

    const d = new Date(e.date);
    if (isNaN(d)) return false; 

    return d >= startDate && d <= now;
  });

  setExpenses(filtered);

  updateTotals(filtered);
};

const updateTotals = (list) => {
  const total = list.reduce((acc, e) => acc+ Number(e.amount), 0);
  setTotalSpending(total);

  const catTotals = {};
  for (const e of list) {
    if (!catTotals[e.category]) catTotals [e.category] = 0;
    catTotals[e.category] += Number(e.amount);
  }
  setCategoryTotals(catTotals);
};

  const addExpense = async () => {
    const amountNumber = parseFloat(amount);
    if (isNaN(amountNumber) || amountNumber <= 0) return;

    const trimmedCategory = category.trim();
    const trimmedNote = note.trim();
    if (!trimmedCategory) return;

    const today = new Date().toISOString();

    await db.runAsync(
    'INSERT INTO expenses (amount, category, note, date) VALUES (?, ?, ?, ?);',
    [amountNumber, trimmedCategory, trimmedNote || null, today]
  );

    setAmount('');
    setCategory('');
    setNote('');

    loadExpenses();
  };

  const updateExpense = async () => {
  if (!editingID) return;

  const amountNumber = parseFloat(amount);
  if (isNaN(amountNumber) || amountNumber <= 0) return;

  await db.runAsync(
    `UPDATE expenses
     SET amount = ?, category = ?, note = ?
     WHERE id = ?;`,
    [amountNumber, category.trim(), note.trim(), editingID] 
  );

  setEditingID(null);
  setAmount('');
  setCategory('');
  setNote('');

  loadExpenses();
};

  const deleteExpense = async (id) => {
    await db.runAsync('DELETE FROM expenses WHERE id = ?;', [id]);
    loadExpenses();
  };

  const startEditing = (exp) => {
    setEditingID(exp.id);
    setAmount(String(exp.amount));
    setCategory(exp.category);
    setNote(exp.note || "");
  };

  const renderExpense = ({ item }) => (
<View style={styles.expenseRow}>
  <View style={{ flex: 1 }}>

    <View style={styles.amountRow}>
      <Text style={styles.expenseAmount}>
        ${Number(item.amount).toFixed(2)}
      </Text>

      <TouchableOpacity onPress={() => startEditing(item)}>
        <Text style={styles.editText}>Edit</Text>
      </TouchableOpacity>
    </View>

    <Text style={styles.expenseCategory}>{item.category}</Text>

    {item.note ? (
      <Text style={styles.expenseNote}>{item.note}</Text>
    ) : null}

    <Text style={styles.expenseDate}>
      {new Date(item.date).toLocaleDateString()}
    </Text>

  </View>

  <TouchableOpacity onPress={() => deleteExpense(item.id)}>
    <Text style={styles.delete}>x</Text>
  </TouchableOpacity>
</View>
  );

  useEffect(() => {
    async function setup() {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      note TEXT
    );
  `);

  try {
    await db.execAsync(`
      ALTER TABLE expenses ADD COLUMN date TEXT;
    `);
  } catch (e) {
  }

  await loadExpenses();
}

    setup();
  }, [filter]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Student Expense Tracker</Text>

      <View style={styles.filterBar}>
        <TouchableOpacity onPress={() => setFilter("all")}>
          <Text style={filter === "all" ? styles.activeFilter : styles.filter}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setFilter("week")}>
          <Text style={filter === "week" ? styles.activeFilter : styles.filter}>This Week</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setFilter("month")}>
          <Text style={filter === "month" ? styles.activeFilter : styles.filter}>This Month</Text>
        </TouchableOpacity>
      </View>

      <View style={{marginBottom: 16}}>
        <Text style={{color: "#fbbf24", fontSize: 18, fontWeight: "700"}}>
          Total Spending ({filter === "all" ? "All" :
                            filter === "week" ? "This Week" :
                            "This Month"}) : ${totalSpending.toFixed(2)}
        </Text>
        <Text style={{color: "#9ca3af", marginTop: 8, fontWeight: "600"}}>By Category:</Text>

        {Object.keys(categoryTotals).length === 0 ? (
          <Text style={{ color: "#6b7280" }}>No expenses.</Text>
        ) : (
          Object.entries(categoryTotals).map(([cat, total]) => (
            <Text key={cat} style={{ color: "#e5e7eb" }}>
              • {cat}: ${total.toFixed(2)}
            </Text>
          ))
        )}
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Amount (e.g. 12.50)"
          placeholderTextColor="#9ca3af"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />
        <TextInput
          style={styles.input}
          placeholder="Category (Food, Books, Rent...)"
          placeholderTextColor="#9ca3af"
          value={category}
          onChangeText={setCategory}
        />
        <TextInput
          style={styles.input}
          placeholder="Note (optional)"
          placeholderTextColor="#9ca3af"
          value={note}
          onChangeText={setNote}
        />
        <Button title={editingID ? "Save Changes" : "Add Expenses"}
        onPress={editingID ? updateExpense : addExpense}/>
      </View>

      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderExpense}
        ListEmptyComponent={<Text style={styles.empty}>No expenses yet.</Text>}
      />

      <Text style={styles.footer}>
        Enter your expenses and they’ll be saved locally with SQLite.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#111827' },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  filter: {
    color: '#9ca3af',
    fontSize: 16,
  },
  activeFilter: {
    color: '#fbbf24',
    fontSize: 16,
    fontWeight: '700',
  },
  form: {
    marginBottom: 16,
    gap: 8,
  },
  input: {
    padding: 10,
    backgroundColor: '#1f2937',
    color: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fbbf24',
  },
  expenseCategory: {
    fontSize: 14,
    color: '#e5e7eb',
  },
  expenseNote: {
    fontSize: 12,
    color: '#9ca3af',
  },
  expenseDate: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  delete: {
    color: '#f87171',
    fontSize: 20,
    marginLeft: 12,
  },
  empty: {
    color: '#9ca3af',
    marginTop: 24,
    textAlign: 'center',
  },
  footer: {
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 12,
    fontSize: 12,
  },

  editText: {
  color: 'white',
  fontSize: 12,
  marginLeft: 6,
},

actionRow: {
  flexDirection: "row",
  alignItems: "center",
  marginLeft: 8,
},

amountRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
},

});