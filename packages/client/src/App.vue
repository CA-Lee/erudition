<template>
  <div>{{ email }}</div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { apiFetch } from './api/client'

const email = ref('')

onMounted(async () => {
  const res = await apiFetch('/me')
  if (res.status === 401) {
    window.location.href = import.meta.env.VITE_APP_URL
    return
  }
  const { email: e } = await res.json()
  email.value = e
})
</script>
