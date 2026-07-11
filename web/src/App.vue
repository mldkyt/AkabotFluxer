<script setup lang="ts">
import { onMounted, ref } from "vue";
import MainPage from "./components/pages/Main.vue";
import ReactionRoles from "./components/pages/ReactionRoles.vue";

const authorized = ref(false);
const authorizing = ref(false);

const page = ref("main");
const token = ref("");
const authError = ref("");

async function login() {
    try {
        authorizing.value = true;
        authError.value = "";

        const result = await fetch("/api/authorize", {
            method: "POST",
            body: JSON.stringify({
                token: token.value,
            }),
            credentials: "include",
        });

        if (!result.ok) {
            authorizing.value = false;
            authError.value = "Invalid token";
        }

        authorizing.value = false;
        authorized.value = true;
        authError.value = "";

        localStorage.setItem("token", token.value);
    } catch (e) {
        authorizing.value = false;
        authError.value = `Something went wrong: ${e}`;
        console.error(e);
    }
}

onMounted(async () => {
    if (
        !localStorage.getItem("token") ||
        localStorage.getItem("token")?.length === 0
    ) {
        return;
    }

    const result = await fetch("/api/authorize", {
        method: "POST",
        body: JSON.stringify({
            token: localStorage.getItem("token"),
        }),
        credentials: "include",
    });

    if (!result.ok) {
        return;
    }

    authorized.value = true;
});
</script>

<template>
    <div v-if="!authorized" className="m-auto w-3/4 min-h-screen">
        <p v-if="authorizing" className="text-lg text-center text-white">
            Authorizing
        </p>
        <div v-else>
            <h1 className="font-bold text-xl text-center">
                Log into the admin panel:
            </h1>
            <input
                type="text"
                v-model="token"
                placeholder="Token"
                className="border-2 rounded-lg border-black dark:border-white m-2 p-2 w-full"
            />

            <button
                @click="login"
                className="bg-blue-500 p-2 rounded-lg w-full"
            >
                Log in
            </button>
            <p v-if="authError" className="text-red-500 text-center">
                An error occurred: {{ authError }}
            </p>
        </div>
    </div>
    <div v-else className="m-auto w-3/4 min-h-screen">
        <label for="page">Page: </label>
        <select id="page" v-model="page">
            <option value="main">Main Page</option>
            <option value="reaction-roles">Reaction Roles</option>
        </select>
        <MainPage v-if="page == 'main'" />
        <ReactionRoles v-if="page == 'reaction-roles'" />
    </div>
</template>
