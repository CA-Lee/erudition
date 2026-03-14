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
    const ssoUrl = `${import.meta.env.VITE_API_URL}/auth/login?redirect=${encodeURIComponent(window.location.href)}`
    window.location.href = ssoUrl
    return
  }
  const { email: e } = await res.json()
  email.value = e
})
</script>
