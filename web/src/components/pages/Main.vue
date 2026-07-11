<script setup lang="ts">
import { ref, onMounted } from "vue";
import Heading from "../base/Heading.vue";

const serverList = ref<{ id: string; name: string }[]>([]);

onMounted(async () => {
    const res = await fetch("/api/servers");
    serverList.value = (await res.json()) as Array<{
        id: string;
        name: string;
    }>;
});
</script>

<template>
    <Heading>Welcome to Akabot</Heading>

    <p>Welcome to Akabot</p>

    <h2>Servers:</h2>
    <ul>
        <li v-for="server in serverList" :key="server.id">{{ server.name }}</li>
    </ul>
</template>
