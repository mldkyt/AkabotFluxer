<script setup lang="ts">
import { computed, onMounted, ref, toValue } from "vue";
import Heading from "../base/Heading.vue";

const loading = ref(true);
const error = ref("");
const iamRoles = ref<{ roleId: string; tag: string }[]>([]);
const roles = ref<{ name: string; id: string }[]>([]);
const message = ref("");

const addNewRole = ref("");
const addNewTag = ref("");

const editRole = ref("");
const editRoleTag = ref("");

async function addNew() {
    try {
        error.value = "";

        const res = await fetch("/api/iam-roles", {
            method: "POST",
            body: JSON.stringify({
                roleId: addNewRole.value,
                tag: addNewTag.value,
            }),
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });

        if (!res.ok) {
            error.value = await res.text();
            return;
        }

        message.value = "Added new role successfully";
        iamRoles.value.push({
            roleId: addNewRole.value,
            tag: addNewTag.value,
        });

        addNewRole.value = "";
        addNewTag.value = "";
    } catch (e) {
        error.value = `Error adding new role: ${e}`;
    }
}

async function startEditRole(roleId: string) {
  const role = iamRoles.value.find(x => x.roleId === roleId);
  if (!role) return;

  editRoleTag.value = role.tag;
  editRole.value = roleId;
}

async function finishEditRole() {
  try {
error.value = "";

    const finishRoleFetch = await fetch("/api/iam-roles", {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`
      },
      method: "PATCH",
      body: JSON.stringify({
        roleId: editRole.value,
        tag: editRoleTag.value
      })
    });

    if (!finishRoleFetch.ok) {
      error.value = await finishRoleFetch.text();
      return;
    }

    iamRoles.value = iamRoles.value.map(x => {
      if (x.roleId === editRole.value) {
        x.tag = editRoleTag.value;
      }

      return x;
    });

        editRole.value = "";
        editRoleTag.value = "";
        message.value = "Edited successfully";
  }
  catch (e) {
    error.value = `An error occured: ${e}`;
      console.log(e);
  }
}

async function deleteRole(roleId: string) {
  try {
error.value = "";

    const finishRoleDelete = await fetch(`/api/iam-roles`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      method: "DELETE",
      body: JSON.stringify({
        id: roleId,
      }),
    });

    if (!finishRoleDelete.ok) {
      error.value = await finishRoleDelete.text();
      return;
    }

    iamRoles.value = iamRoles.value.filter(x => x.roleId !== deleteRole.value);
  }
  catch (e) {
    error.value = `An error occured: ${e}`;
      console.log(e);
  }
}

onMounted(async () => {
    const iamRolesFetch = await fetch("/api/iam-roles", {
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
    });
    if (!iamRolesFetch.ok) {
        error.value = await iamRolesFetch.text();
    }

    const rolesFetch = await fetch("/api/roles", {
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
    });
    if (!rolesFetch.ok) {
        error.value = await rolesFetch.text();
    }

    const parsedIamRoles = await iamRolesFetch.json();
    iamRoles.value = parsedIamRoles;
    const parsedRoles = await rolesFetch.json();
    roles.value = parsedRoles;
    loading.value = false;
});
</script>

<template>
    <Heading>"I am" Roles</Heading>
    <p v-if="error.length > 0" className="text-red-500">{{ error }}</p>
    <p v-if="message" className="text-green-500">{{ message }}</p>
    <p v-if="loading">Loading...</p>
    <div v-else>
        <div
            v-for="(role, index) in iamRoles"
            :key="index"
            className="m-2 p-2 border-2 border-black dark:border-white rounded-lg"
        >
            <h2 className="text-xl font-bold" v-if="editRole === role.roleId">
                !iam <input type="text" v-model="editRoleTag" className="border-2 border-white dark:border-black rounded-lg"></input>
            </h2>
            <h2 className="text-xl font-bold" v-else>!iam {{ role.tag }}</h2>
            <p>
                This will give out the role with the name "{{
                    roles.find((r) => r.id === role.roleId)?.name || "Unknown"
                }}"
            </p>
            <button @click="finishEditRole" v-if="editRole === role.roleId" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Save</button>
            <button @click="() => startEditRole(role.roleId)" v-else className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Edit</button>
            <button @click="deleteRole(role.roleId)" className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg">Delete</button>
        </div>

        <div
            className="border-2 border-black dark:border-white rounded-lg m-2 p-2"
        >
            <h2 className="text-xl font-bold">Add new</h2>
            <!-- select for ID, text for tag -->

            <label for="role" class="block mb-1">Role:</label>
            <select
                v-model="addNewRole"
                class="border-2 border-black dark:border-white rounded-lg m-2 p-2"
            >
                <option value="" disabled selected>Select a role</option>
                <option
                    :value="role.id"
                    v-for="(role, index) in roles"
                    :key="index"
                >
                    {{ role.name }}
                </option>
            </select>
            <br />

            <label for="tag" class="block mb-1">Tag:</label>
            <input
                v-model="addNewTag"
                type="text"
                id="tag"
                placeholder="Enter a tag"
                className="border-2 border-black dark:border-white rounded-lg m-2 p-2"
            />

            <br />

            <button
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
                @click="addNew"
            >
                Save
            </button>
        </div>
    </div>
</template>
