#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import time
import threading
import platform
from typing import Dict, List, Optional

# Importaciones específicas por plataforma
if platform.system() == 'Windows':
    import msvcrt
    import ctypes
    from ctypes import wintypes
else:
    import tty
    import termios
    import select

class Colors:
    """Códigos de color ANSI multiplataforma"""
    RESET = '\033[0m'
    BRIGHT = '\033[1m'
    DIM = '\033[2m'
    RED = '\033[31m'
    GREEN = '\033[32m'
    YELLOW = '\033[33m'
    BLUE = '\033[34m'
    MAGENTA = '\033[35m'
    CYAN = '\033[36m'
    WHITE = '\033[37m'
    BLACK = '\033[30m'
    BG_BLACK = '\033[40m'
    BG_RED = '\033[41m'
    BG_GREEN = '\033[42m'
    BG_YELLOW = '\033[43m'
    BG_BLUE = '\033[44m'
    BG_MAGENTA = '\033[45m'
    BG_CYAN = '\033[46m'
    BG_WHITE = '\033[47m'

class TerminalUtils:
    """Utilidades de terminal multiplataforma"""
    
    @staticmethod
    def hide_cursor():
        """Oculta el cursor"""
        sys.stdout.write('\033[?25l')
        sys.stdout.flush()
    
    @staticmethod
    def show_cursor():
        """Muestra el cursor"""
        sys.stdout.write('\033[?25h')
        sys.stdout.flush()
    
    @staticmethod
    def clear_screen():
        """Limpia la pantalla"""
        sys.stdout.write('\033[2J')
        sys.stdout.flush()
    
    @staticmethod
    def goto_position(row: int, col: int):
        """Mueve el cursor a una posición específica"""
        sys.stdout.write(f'\033[{row};{col}H')
        sys.stdout.flush()
    
    @staticmethod
    def clear_from_cursor():
        """Limpia desde el cursor hacia abajo"""
        sys.stdout.write('\033[0J')
        sys.stdout.flush()
    
    @staticmethod
    def enable_alt_screen():
        """Habilita pantalla alternativa"""
        sys.stdout.write('\033[?1049h')
        sys.stdout.flush()
    
    @staticmethod
    def disable_alt_screen():
        """Deshabilita pantalla alternativa"""
        sys.stdout.write('\033[?1049l')
        sys.stdout.flush()

class KeyboardInput:
    """Manejo de entrada de teclado multiplataforma"""
    
    def __init__(self):
        self.is_windows = platform.system() == 'Windows'
        self.old_settings = None
        
        if not self.is_windows:
            self.old_settings = termios.tcgetattr(sys.stdin)
            tty.setraw(sys.stdin.fileno())
    
    def __del__(self):
        self.restore()
    
    def restore(self):
        """Restaura configuración original del terminal"""
        if not self.is_windows and self.old_settings:
            termios.tcsetattr(sys.stdin, termios.TCSADRAIN, self.old_settings)
    
    def get_key(self) -> Optional[str]:
        """Obtiene una tecla presionada de forma no bloqueante"""
        if self.is_windows:
            return self._get_key_windows()
        else:
            return self._get_key_unix()
    
    def _get_key_windows(self) -> Optional[str]:
        """Obtiene tecla en Windows"""
        if msvcrt.kbhit():
            key = msvcrt.getch()
            if key == b'\x00' or key == b'\xe0':  # Teclas especiales
                key2 = msvcrt.getch()
                return self._parse_special_key_windows(key2)
            else:
                return key.decode('utf-8', errors='ignore')
        return None
    
    def _get_key_unix(self) -> Optional[str]:
        """Obtiene tecla en Unix/Linux/macOS"""
        if select.select([sys.stdin], [], [], 0)[0]:
            key = sys.stdin.read(1)
            if key == '\033':  # Secuencia de escape
                if select.select([sys.stdin], [], [], 0.1)[0]:
                    key += sys.stdin.read(1)
                    if key == '\033[':
                        if select.select([sys.stdin], [], [], 0.1)[0]:
                            key += sys.stdin.read(1)
                            return self._parse_special_key_unix(key)
            return key
        return None
    
    def _parse_special_key_windows(self, key: bytes) -> str:
        """Parsea teclas especiales en Windows"""
        key_map = {
            b'H': 'up',
            b'P': 'down',
            b'K': 'left',
            b'M': 'right'
        }
        return key_map.get(key, 'unknown')
    
    def _parse_special_key_unix(self, key: str) -> str:
        """Parsea teclas especiales en Unix"""
        key_map = {
            '\033[A': 'up',
            '\033[B': 'down',
            '\033[D': 'left',
            '\033[C': 'right'
        }
        return key_map.get(key, 'unknown')

class TodogramMenu:
    """Menú interactivo TODOGRAM"""
    
    def __init__(self):
        self.selected_index = 0
        self.number_input = ''
        self.number_input_timer = None
        
        # Dimensiones fijas optimizadas
        self.MENU_WIDTH = 88
        self.MENU_HEIGHT = 25
        self.COLUMN_WIDTH = 42
        
        self.menu_items = [
            {"id": 1, "title": "🚀 Obtener datos Notion/TMDB", "category": "operations", "info": "Sincroniza datos desde Notion API y TMDB para actualizar la base de datos del proyecto."},
            {"id": 2, "title": "🤖 Auto-push automático", "category": "operations", "info": "Configura el sistema de push automático que detecta cambios y los sube al repositorio."},
            {"id": 3, "title": "🪵 Ver logs tiempo real", "category": "operations", "info": "Muestra los logs del sistema en tiempo real para monitorear la actividad."},
            {"id": 4, "title": "📦 Push completo Git", "category": "operations", "info": "Realiza un push completo de todos los cambios pendientes al repositorio Git."},
            {"id": 5, "title": "⚡ Workflow GitHub Actions", "category": "operations", "info": "Ejecuta y monitorea los workflows de GitHub Actions configurados."},
            {"id": 6, "title": "🌐 Deploy GitHub Pages", "category": "operations", "info": "Despliega la aplicación en GitHub Pages utilizando la rama configurada."},
            {"id": 7, "title": "🚀 Deploy Netlify/Vercel", "category": "operations", "info": "Despliega la aplicación en plataformas como Netlify o Vercel."},
            {"id": 8, "title": "⚙️ Config variables entorno", "category": "operations", "info": "Configura las variables de entorno necesarias para el funcionamiento del sistema."},
            {"id": 9, "title": "⏹️ Detener PM2 auto-push", "category": "operations", "info": "Detiene el proceso PM2 que maneja el auto-push automático."},
            {"id": 10, "title": "🔄 Reiniciar procesos PM2", "category": "operations", "info": "Reinicia todos los procesos PM2 activos en el sistema."},
            {"id": 11, "title": "📊 Estado PM2", "category": "maintenance", "info": "Muestra el estado actual de todos los procesos PM2 en ejecución."},
            {"id": 12, "title": "🗂️ Lista PM2", "category": "maintenance", "info": "Lista detallada de todos los procesos PM2 configurados y su estado."},
            {"id": 13, "title": "🔧 Chequear dependencias", "category": "maintenance", "info": "Verifica el estado de todas las dependencias del proyecto."},
            {"id": 14, "title": "🛠️ Actualizar dependencias", "category": "maintenance", "info": "Actualiza todas las dependencias del proyecto a sus últimas versiones."},
            {"id": 15, "title": "🔍 Ejecutar tests", "category": "maintenance", "info": "Ejecuta la suite completa de tests del proyecto."},
            {"id": 16, "title": "📝 Generar docs", "category": "maintenance", "info": "Genera la documentación automática del proyecto."},
            {"id": 17, "title": "🧹 Limpiar temp files", "category": "maintenance", "info": "Limpia archivos temporales y cache del sistema."},
            {"id": 18, "title": "✨ Update datos Notion/TMDB", "category": "maintenance", "info": "Actualiza y sincroniza los datos más recientes desde Notion y TMDB."},
            {"id": 19, "title": "🔍 Analizar rendimiento", "category": "maintenance", "info": "Analiza el rendimiento del sistema y genera un reporte detallado."},
            {"id": 20, "title": "📊 Reporte de estado", "category": "maintenance", "info": "Genera un reporte completo del estado actual del sistema."}
        ]
        
        self.colors = Colors()
        self.is_rendering = False
        self.running = True
        
        # Configurar terminal
        self.setup_terminal()
        self.keyboard = KeyboardInput()
        
        # Iniciar bucle principal
        self.main_loop()  # Cambiado de self.run() a self.main_loop()
    
    def setup_terminal(self):
        """Configura el terminal"""
        TerminalUtils.hide_cursor()
        TerminalUtils.clear_screen()
        TerminalUtils.goto_position(1, 1)
        TerminalUtils.enable_alt_screen()
    
    def cleanup_terminal(self):
        """Limpia y restaura el terminal"""
        TerminalUtils.clear_screen()
        TerminalUtils.goto_position(1, 1)
        TerminalUtils.show_cursor()
        TerminalUtils.disable_alt_screen()
    
    def handle_number_input(self, digit: str):
        """Maneja la entrada numérica para selección directa"""
        self.number_input += digit
        
        if self.number_input_timer:
            self.number_input_timer.cancel()
        
        if len(self.number_input) == 2:
            self.process_number_input()
            return
        
        self.number_input_timer = threading.Timer(0.8, self.process_number_input)
        self.number_input_timer.start()
    
    def process_number_input(self):
        """Procesa la entrada numérica"""
        if self.number_input:
            try:
                num = int(self.number_input)
                if 1 <= num <= 20:
                    self.select_by_number(num)
            except ValueError:
                pass
            self.number_input = ''
    
    def move_up(self):
        """Mueve la selección hacia arriba"""
        if self.selected_index > 0:
            self.selected_index -= 1
            self.render_menu()
    
    def move_down(self):
        """Mueve la selección hacia abajo"""
        if self.selected_index < len(self.menu_items) - 1:
            self.selected_index += 1
            self.render_menu()
    
    def move_left(self):
        """Mueve la selección hacia la izquierda"""
        if self.selected_index >= 10:
            self.selected_index -= 10
            self.render_menu()
    
    def move_right(self):
        """Mueve la selección hacia la derecha"""
        if self.selected_index < 10:
            self.selected_index += 10
            self.render_menu()
    
    def select_by_number(self, num: int):
        """Selecciona elemento por número"""
        self.selected_index = num - 1
        self.render_menu()
    
    def execute_selected(self):
        """Ejecuta la opción seleccionada"""
        selected_item = self.menu_items[self.selected_index]
        self.show_item_info(selected_item)
    
    def show_item_info(self, item: Dict):
        """Muestra información del elemento"""
        self.render_full_screen(lambda: [
            self.print_header(),
            self.print_info_box(item),
            print(f"\n{self.colors.CYAN}🎮 Presiona cualquier tecla para volver al menú...{self.colors.RESET}")
        ])
        
        # Esperar entrada
        while True:
            key = self.keyboard.get_key()
            if key:
                break
            time.sleep(0.01)
        
        self.render()
    
    def print_info_box(self, item: Dict):
        """Imprime la caja de información del elemento"""
        c = self.colors
        border = '═' * self.MENU_WIDTH
        
        print(f"{c.CYAN}╔{border}╗{c.RESET}")
        print(f"{c.CYAN}║{c.YELLOW}{self.center_text(f'═══ INFORMACIÓN DE LA OPCIÓN [{item["id"]}] ═══', self.MENU_WIDTH)}{c.CYAN}║{c.RESET}")
        print(f"{c.CYAN}║{' ' * self.MENU_WIDTH}║{c.RESET}")
        
        # Título
        title = f"🎯 {item['title']}"
        print(f"{c.CYAN}║{c.GREEN} {self.truncate_text(title, self.MENU_WIDTH - 2)} {c.CYAN}║{c.RESET}")
        print(f"{c.CYAN}║{' ' * self.MENU_WIDTH}║{c.RESET}")
        
        # Categoría
        category_text = f"📂 Categoría: {'OPERACIONES' if item['category'] == 'operations' else 'MANTENIMIENTO'}"
        print(f"{c.CYAN}║{c.BLUE} {self.truncate_text(category_text, self.MENU_WIDTH - 2)} {c.CYAN}║{c.RESET}")
        print(f"{c.CYAN}║{' ' * self.MENU_WIDTH}║{c.RESET}")
        
        # Descripción
        print(f"{c.CYAN}║{c.WHITE} 📝 Descripción:{' ' * (self.MENU_WIDTH - 17)}║{c.RESET}")
        
        # Dividir descripción en líneas
        description = item['info']
        words = description.split()
        lines = []
        current_line = ""
        
        for word in words:
            if len(current_line + " " + word) <= self.MENU_WIDTH - 6:
                if current_line:
                    current_line += " " + word
                else:
                    current_line = word
            else:
                if current_line:
                    lines.append(current_line)
                current_line = word
        
        if current_line:
            lines.append(current_line)
        
        for line in lines:
            padded_line = f"    {line}".ljust(self.MENU_WIDTH - 2)
            print(f"{c.CYAN}║{c.WHITE} {padded_line} {c.CYAN}║{c.RESET}")
        
        print(f"{c.CYAN}║{' ' * self.MENU_WIDTH}║{c.RESET}")
        print(f"{c.CYAN}║{c.YELLOW} ⚡ Estado: DISPONIBLE                                                             {c.CYAN}║{c.RESET}")
        print(f"{c.CYAN}║{c.MAGENTA} 🔧 Ejecutar: Presiona [ENTER] para ejecutar esta opción                          {c.CYAN}║{c.RESET}")
        print(f"{c.CYAN}║{' ' * self.MENU_WIDTH}║{c.RESET}")
        print(f"{c.CYAN}╚{border}╝{c.RESET}")
    
    def show_help(self):
        """Muestra la ayuda"""
        self.render_full_screen(lambda: [
            self.print_header(),
            self.print_help_box(),
            print(f"\n{self.colors.CYAN}🎮 Presiona cualquier tecla para volver al menú...{self.colors.RESET}")
        ])
        
        # Esperar entrada
        while True:
            key = self.keyboard.get_key()
            if key:
                break
            time.sleep(0.01)
        
        self.render()
    
    def print_help_box(self):
        """Imprime la caja de ayuda"""
        c = self.colors
        border = '═' * self.MENU_WIDTH
        
        print(f"{c.CYAN}╔{border}╗{c.RESET}")
        print(f"{c.CYAN}║{c.YELLOW}{self.center_text('═══ AYUDA DEL SISTEMA TODOGRAM ═══', self.MENU_WIDTH)}{c.CYAN}║{c.RESET}")
        print(f"{c.CYAN}║{' ' * self.MENU_WIDTH}║{c.RESET}")
        
        help_items = [
            ("🎮 NAVEGACIÓN:", ""),
            ("   ↑ ↓", "Mover arriba/abajo en la columna actual"),
            ("   ← →", "Cambiar entre columnas izquierda/derecha"),
            ("", ""),
            ("🎯 SELECCIÓN:", ""),
            ("   ENTER", "Ejecutar opción seleccionada"),
            ("   1-20", "Selección directa por número"),
            ("", ""),
            ("ℹ️  INFORMACIÓN:", ""),
            ("   H", "Mostrar esta ayuda"),
            ("   X", "Salir del programa"),
            ("", ""),
            ("📊 CATEGORÍAS:", ""),
            ("   OPERACIONES", "Tareas de trabajo diario (1-10)"),
            ("   MANTENIMIENTO", "Tareas de mantenimiento (11-20)"),
            ("", ""),
            ("🔧 FUNCIONALIDADES:", ""),
            ("   • Navegación fluida con teclas de dirección"),
            ("   • Selección rápida con números"),
            ("   • Información detallada de cada opción"),
            ("   • Interfaz colorida y fácil de usar")
        ]
        
        for label, description in help_items:
            if not label and not description:
                print(f"{c.CYAN}║{' ' * self.MENU_WIDTH}║{c.RESET}")
            elif description:
                line = f" {label:<15} {description}"
                print(f"{c.CYAN}║{c.WHITE}{self.truncate_text(line, self.MENU_WIDTH - 2)}{c.CYAN}║{c.RESET}")
            else:
                print(f"{c.CYAN}║{c.GREEN} {label:<{self.MENU_WIDTH - 3}}{c.CYAN}║{c.RESET}")
        
        print(f"{c.CYAN}║{' ' * self.MENU_WIDTH}║{c.RESET}")
        print(f"{c.CYAN}║{c.YELLOW} 💡 TIP: Usa los números 1-20 para selección rápida de opciones               {c.CYAN}║{c.RESET}")
        print(f"{c.CYAN}║{' ' * self.MENU_WIDTH}║{c.RESET}")
        print(f"{c.CYAN}╚{border}╝{c.RESET}")
    
    def exit_program(self):
        """Sale del programa"""
        self.running = False
        if self.number_input_timer:
            self.number_input_timer.cancel()
        self.cleanup_terminal()
        print(f"\n{self.colors.YELLOW}👋 ¡Hasta luego! Saliendo del sistema TODOGRAM...{self.colors.RESET}\n")
        sys.exit(0)
    
    def render_full_screen(self, callback):
        """Renderiza pantalla completa"""
        self.is_rendering = True
        TerminalUtils.clear_screen()
        TerminalUtils.goto_position(1, 1)
        callback()
        self.is_rendering = False
    
    def render_menu(self):
        """Renderiza solo el menú"""
        if self.is_rendering:
            return
        
        self.is_rendering = True
        
        # Construir contenido del menú
        c = self.colors
        selected_item = self.menu_items[self.selected_index]
        border = '═' * self.MENU_WIDTH
        
        menu_content = []
        
        # Barra de navegación
        menu_content.append(f"{c.CYAN}╠{border}╣{c.RESET}")
        menu_content.append(f"{c.CYAN}║{c.MAGENTA} 🎮 NAV: ↑↓←→ Mover {c.CYAN}│{c.GREEN} ENTER Ejecutar {c.CYAN}│{c.YELLOW} 1-20 Directo ({selected_item['id']}) {c.CYAN}│{c.BLUE} H Ayuda {c.CYAN}│{c.RED} X Salir {c.CYAN}║{c.RESET}")
        menu_content.append(f"{c.CYAN}╠{border}╣{c.RESET}")
        
        selected_title = self.truncate_text(f"Seleccionado: {selected_item['title']}", self.MENU_WIDTH - 2)
        menu_content.append(f"{c.CYAN}║{c.WHITE} {selected_title} {c.CYAN}║{c.RESET}")
        menu_content.append(f"{c.CYAN}╚{border}╝{c.RESET}")
        
        # Menú principal
        menu_content.append(f"{c.CYAN}╔{border}╗{c.RESET}")
        menu_content.append(f"{c.CYAN}║{c.YELLOW}{self.center_text('═══ MENÚ ═══', self.MENU_WIDTH)}{c.CYAN}║{c.RESET}")
        menu_content.append(f"{c.CYAN}║{' ' * self.MENU_WIDTH}║{c.RESET}")
        menu_content.append(f"{c.CYAN}║{c.GREEN} 📊 OPERACIONES (1-10)               {c.CYAN}│{c.BLUE} 🔧 MANTENIMIENTO (11-20)              {c.CYAN}║{c.RESET}")
        menu_content.append(f"{c.CYAN}║{' ' * (self.MENU_WIDTH // 2 - 1)}│{' ' * (self.MENU_WIDTH - self.MENU_WIDTH // 2 - 1)}║{c.RESET}")
        
        # Generar las 10 filas del menú
        for i in range(10):
            left_item = self.menu_items[i]
            right_item = self.menu_items[i + 10]
            left_selected = self.selected_index == i
            right_selected = self.selected_index == (i + 10)
            
            menu_content.append(self.create_menu_line(left_item, right_item, left_selected, right_selected))
        
        menu_content.append(f"{c.CYAN}║{' ' * self.MENU_WIDTH}║{c.RESET}")
        menu_content.append(f"{c.CYAN}║{c.YELLOW}{' ' * (self.MENU_WIDTH - 2)}{c.CYAN}║{c.RESET}")
        menu_content.append(f"{c.CYAN}║{c.RED}           ❌ [X] Salir                    {c.CYAN}│{c.BLUE}              ℹ️ [H] Ayuda               {c.CYAN}║{c.RESET}")
        menu_content.append(f"{c.CYAN}╚{border}╝{c.RESET}")
        
        # Posicionarse y escribir contenido
        TerminalUtils.goto_position(13, 1)
        TerminalUtils.clear_from_cursor()
        
        for line in menu_content:
            print(line)
        
        self.is_rendering = False
    
    def render(self):
        """Renderiza la pantalla completa"""
        self.render_full_screen(lambda: [
            self.print_header(),
            self.print_navigation_bar(),
            self.print_menu(),
            self.print_footer()
        ])
    
    def truncate_text(self, text: str, max_length: int) -> str:
        """Trunca el texto si es necesario"""
        if len(text) <= max_length:
            return text.ljust(max_length)
        return text[:max_length - 3] + '...'
    
    def center_text(self, text: str, width: int) -> str:
        """Centra el texto"""
        padding = max(0, width - len(text))
        left_pad = padding // 2
        right_pad = padding - left_pad
        return ' ' * left_pad + text + ' ' * right_pad
    
    def create_menu_line(self, left_item: Dict, right_item: Dict, left_selected: bool, right_selected: bool) -> str:
        """Crea una línea del menú"""
        c = self.colors
        col_width = (self.MENU_WIDTH - 3) // 2
        
        # Configuración de colores para selección
        left_bg = c.BG_GREEN if left_selected else ''
        left_fg = c.BLACK if left_selected else c.WHITE
        left_reset = c.RESET if left_selected else ''
        
        right_bg = c.BG_GREEN if right_selected else ''
        right_fg = c.BLACK if right_selected else c.WHITE
        right_reset = c.RESET if right_selected else ''
        
        # Formatear lado izquierdo
        left_num = f"[{left_item['id']:2d}]"
        left_title = left_item['title'][:col_width - 5]
        left_content = f"{left_num} {left_title}"
        left_formatted = self.truncate_text(left_content, col_width)
        
        # Formatear lado derecho
        right_num = f"[{right_item['id']}]"
        right_title = right_item['title'][:col_width - 5]
        right_content = f"{right_num} {right_title}"
        right_formatted = self.truncate_text(right_content, col_width)
        
        return f"{c.CYAN}║{left_bg}{left_fg} {left_formatted} {left_reset}{c.CYAN}│{right_bg}{right_fg} {right_formatted} {right_reset}{c.CYAN}║{c.RESET}"
    
    def print_header(self):
        """Imprime el header"""
        c = self.colors
        border = '═' * self.MENU_WIDTH
        
        print(f"{c.CYAN}╔{border}╗{c.RESET}")
        print(f"{c.CYAN}║{c.BLUE}                                                                                        {c.CYAN}║{c.RESET}")
        print(f"{c.CYAN}║{c.BLUE}        ████████{c.GREEN}╗{c.BLUE} ██████{c.GREEN}╗{c.BLUE} ██████{c.GREEN}╗{c.BLUE}  ██████{c.GREEN}╗{c.BLUE}  ██████{c.GREEN}╗{c.BLUE} ██████{c.GREEN}╗{c.BLUE}  █████{c.GREEN}╗{c.BLUE} ███{c.GREEN}╗{c.BLUE}   ███{c.GREEN}╗         {c.CYAN}║{c.RESET}")
        print(f"{c.CYAN}║{c.GREEN}        ╚══{c.BLUE}██{c.GREEN}╔══╝{c.BLUE}██{c.GREEN}╔═══{c.BLUE}██{c.GREEN}╗{c.BLUE}██{c.GREEN}╔══{c.BLUE}██{c.GREEN}╗{c.BLUE}██{c.GREEN}╔═══{c.BLUE}██{c.GREEN}╗{c.BLUE}██{c.GREEN}╔════╝{c.BLUE} ██{c.GREEN}╔══{c.BLUE}██{c.GREEN}╗{c.BLUE}██{c.GREEN}╔══{c.BLUE}██{c.GREEN}╗{c.BLUE}████{c.GREEN}╗{c.BLUE} ████{c.GREEN}║         {c.CYAN}║{c.RESET}")
        print(f"{c.CYAN}║{c.BLUE}           ██{c.GREEN}║{c.BLUE}   ██{c.GREEN}║{c.BLUE}   ██{c.GREEN}║{c.BLUE}██{c.GREEN}║{c.BLUE}  ██{c.GREEN}║{c.BLUE}██{c.GREEN}║{c.BLUE}   ██{c.GREEN}║{c.BLUE}██{c.GREEN}║{c.BLUE}  ███{c.GREEN}╗{c.BLUE}██████{c.GREEN}╔╝{c.BLUE}███████{c.GREEN}║{c.BLUE}██{c.GREEN}╔{c.BLUE}████{c.GREEN}╔{c.BLUE}██{c.GREEN}║         {c.CYAN}║{c.RESET}")
        print(f"{c.CYAN}║{c.GREEN}           ██{c.BLUE}║{c.GREEN}   ██{c.BLUE}║{c.GREEN}   ██{c.BLUE}║{c.GREEN}██{c.BLUE}║{c.GREEN}  ██{c.BLUE}║{c.GREEN}██{c.BLUE}║{c.GREEN}   ██{c.BLUE}║{c.GREEN}██{c.BLUE}║{c.GREEN}   ██{c.BLUE}║{c.GREEN}██{c.BLUE}╔══{c.GREEN}██{c.BLUE}╗{c.GREEN}██{c.BLUE}╔══{c.GREEN}██{c.BLUE}║{c.GREEN}██{c.BLUE}║{c.GREEN}╚██{c.BLUE}╔╝{c.GREEN}██{c.BLUE}║         {c.CYAN}║{c.RESET}")
        print(f"{c.CYAN}║{c.BLUE}           ██{c.GREEN}║{c.BLUE}   {c.GREEN}╚{c.BLUE}██████{c.GREEN}╔╝{c.BLUE}██████{c.GREEN}╔╝{c.BLUE} {c.GREEN}╚{c.BLUE}██████{c.GREEN}╔╝{c.BLUE} {c.GREEN}╚{c.BLUE}██████{c.GREEN}╔╝{c.BLUE}██{c.GREEN}║{c.BLUE}  ██{c.GREEN}║{c.BLUE}██{c.GREEN}║{c.BLUE}  ██{c.GREEN}║{c.BLUE}██{c.GREEN}║{c.BLUE} {c.GREEN}╚═╝{c.BLUE} ██{c.GREEN}║         {c.CYAN}║{c.RESET}")
        print(f"{c.CYAN}║{c.GREEN}           ╚═╝{c.BLUE}    {c.GREEN}╚═════╝{c.BLUE} {c.GREEN}╚═════╝{c.BLUE}   {c.GREEN}╚═════╝{c.BLUE}   {c.GREEN}╚═════╝{c.BLUE} {c.GREEN}╚═╝{c.BLUE}  {c.GREEN}╚═╝{c.BLUE}{c.GREEN}╚═╝{c.BLUE}  {c.GREEN}╚═╝{c.BLUE}{c.GREEN}╚═╝{c.BLUE}     {c.GREEN}╚═╝         {c.CYAN}║{c.RESET}")
        print(f"{c.CYAN}║{c.BLUE}                                                                                        {c.CYAN}║{c.RESET}")
        print(f"{c.CYAN}║{c.YELLOW}{self.center_text('🚀 Sistema de Gestión de Proyectos TODOGRAM v2.1 🚀', self.MENU_WIDTH)}{c.CYAN}║{c.RESET}")
        print(f"{c.CYAN}║{c.WHITE}{self.center_text('Herramienta completa para automatización y despliegue', self.MENU_WIDTH)}{c.CYAN}║{c.RESET}")
        print(f"{c.CYAN}║{c.BLUE}                                                                                        {c.CYAN}║{c.RESET}")
        print(f"{c.CYAN}╚{border}╝{c.RESET}")
    
    def print_navigation_bar(self):
        """Imprime la barra de navegación"""
        c = self.colors
        selected_item = self.menu_items[self.selected_index]
        border = '═' * self.MENU_WIDTH
        
        print(f"{c.CYAN}╠{border}╣{c.RESET}")
        
        # Información de entrada numérica si está activa
        if self.number_input:
            nav_text = f" 🎮 NAV: ↑↓←→ Mover │ ENTER Ejecutar │ Escribiendo: {self.number_input}_ │ H Ayuda │ X Salir "
        else:
            nav_text = f" 🎮 NAV: ↑↓←→ Mover │ ENTER Ejecutar │ 1-20 Directo ({selected_item['id']}) │ H Ayuda │ X Salir "
        
        print(f"{c.CYAN}║{c.MAGENTA}{self.truncate_text(nav_text, self.MENU_WIDTH)}{c.CYAN}║{c.RESET}")
        print(f"{c.CYAN}╠{border}╣{c.RESET}")
        
        selected_title = self.truncate_text(f"Seleccionado: {selected_item['title']}", self.MENU_WIDTH - 2)
        print(f"{c.CYAN}║{c.WHITE} {selected_title} {c.CYAN}║{c.RESET}")
        print(f"{c.CYAN}╚{border}╝{c.RESET}")
    
    def print_menu(self):
        """Imprime el menú principal"""
        c = self.colors
        border = '═' * self.MENU_WIDTH
        
        print(f"{c.CYAN}╔{border}╗{c.RESET}")
        print(f"{c.CYAN}║{c.YELLOW}{self.center_text('═══ MENÚ PRINCIPAL ═══', self.MENU_WIDTH)}{c.CYAN}║{c.RESET}")
        print(f"{c.CYAN}║{' ' * self.MENU_WIDTH}║{c.RESET}")
        print(f"{c.CYAN}║{c.GREEN} 📊 OPERACIONES (1-10)               {c.CYAN}│{c.BLUE} 🔧 MANTENIMIENTO (11-20)              {c.CYAN}║{c.RESET}")
        print(f"{c.CYAN}║{' ' * (self.MENU_WIDTH // 2 - 1)}│{' ' * (self.MENU_WIDTH - self.MENU_WIDTH // 2 - 1)}║{c.RESET}")
        
        # Generar las 10 filas del menú
        for i in range(10):
            left_item = self.menu_items[i]
            right_item = self.menu_items[i + 10]
            left_selected = self.selected_index == i
            right_selected = self.selected_index == (i + 10)
            
            print(self.create_menu_line(left_item, right_item, left_selected, right_selected))
        
        print(f"{c.CYAN}║{' ' * self.MENU_WIDTH}║{c.RESET}")
        print(f"{c.CYAN}╚{border}╝{c.RESET}")
    
    def print_footer(self):
        """Imprime el footer"""
        c = self.colors
        border = '═' * self.MENU_WIDTH
        
        print(f"{c.CYAN}╔{border}╗{c.RESET}")
        print(f"{c.CYAN}║{c.RED}           ❌ [X] Salir                    {c.CYAN}│{c.BLUE}              ℹ️ [H] Ayuda               {c.CYAN}║{c.RESET}")
        print(f"{c.CYAN}╚{border}╝{c.RESET}")
        print(f"\n{c.YELLOW}💡 Tip: Usa los números 1-20 para selección rápida{c.RESET}")
    
    def process_key(self, key: str):
        """Procesa una tecla presionada"""
        if key.isdigit():
            self.handle_number_input(key)
        elif key == 'up':
            self.move_up()
        elif key == 'down':
            self.move_down()
        elif key == 'left':
            self.move_left()
        elif key == 'right':
            self.move_right()
        elif key == '\r' or key == '\n':  # Enter
            self.execute_selected()
        elif key.lower() == 'h':
            self.show_help()
        elif key.lower() == 'x':
            self.exit_program()
    
    def main_loop(self):
        """Bucle principal del programa"""
        try:
            # Render inicial
            self.render()
            
            while self.running:
                key = self.keyboard.get_key()
                if key:
                    self.process_key(key)
                
                time.sleep(0.01)  # Pequeña pausa para no saturar la CPU
                
        except KeyboardInterrupt:
            self.exit_program()
        except Exception as e:
            self.cleanup_terminal()
            print(f"\n{self.colors.RED}❌ Error inesperado: {e}{self.colors.RESET}\n")
            sys.exit(1)

def main():
    """Función principal"""
    try:
        # Verificar compatibilidad del terminal
        if os.name == 'nt':
            # Windows: Habilitar colores ANSI
            kernel32 = ctypes.windll.kernel32
            kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
        
        # Inicializar el menú
        TodogramMenu()
        
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}👋 ¡Hasta luego! Programa interrumpido por el usuario.{Colors.RESET}\n")
        sys.exit(0)
    except Exception as e:
        print(f"\n{Colors.RED}❌ Error fatal: {e}{Colors.RESET}\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
