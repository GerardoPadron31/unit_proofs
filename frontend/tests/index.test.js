/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { getByLabelText, getByRole, getByText } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import fs from 'fs';
import path from 'path';

describe('Pruebas unitarias para index.html (Formulario de Login)', () => {

    beforeEach(() => {
        // Cargar el HTML real en la memoria del entorno virtual (JSDOM)
        const htmlPath = path.resolve(__dirname, '../index.html');
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        document.documentElement.innerHTML = htmlContent;
    });

    it('Debe renderizar correctamente los elementos principales del formulario', () => {
        // Verificar título e instrucciones
        expect(getByRole(document.body, 'heading', { name: /login/i })).not.toBeNull();
        
        // Verificar campos del formulario por su ID/Etiqueta
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const submitButton = getByRole(document.body, 'button', { name: /log in/i });

        expect(usernameInput).not.toBeNull();
        expect(passwordInput).not.toBeNull();
        expect(submitButton).not.toBeNull();
    });

    it('Debe tener los atributos HTML correctos en los inputs', () => {
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');

        // Validar tipos de input y placeholders
        expect(usernameInput.getAttribute('type')).toBe('text');
        expect(usernameInput.getAttribute('placeholder')).toBe('your-email@gmail.com');

        expect(passwordInput.getAttribute('type')).toBe('password');
        expect(passwordInput.getAttribute('placeholder')).toBe('Your Password');
    });

    it('Debe permitir escribir en los campos de usuario y contraseña', async () => {
        const user = userEvent.setup();
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');

        // Simular que el usuario tipea
        await user.type(usernameInput, 'usuario@ejemplo.com');
        await user.type(passwordInput, 'miContrasena123');

        expect(usernameInput.value).toBe('usuario@ejemplo.com');
        expect(passwordInput.value).toBe('miContrasena123');
    });

    it('Debe verificar el estado del checkbox "Remember me"', async () => {
        const user = userEvent.setup();
        const checkbox = document.querySelector('input[type="checkbox"]');

        // Por defecto en el HTML viene con checked="checked"
        expect(checkbox.checked).toBe(true);

        // Desmarcar checkbox al hacer clic
        await user.click(checkbox);
        expect(checkbox.checked).toBe(false);
    });

    it('Debe prevenir el envío predeterminado o capturar el evento onSubmit', async () => {
        const user = userEvent.setup();
        const form = document.querySelector('form');
        let formEnviado = false;

        // Escuchar el evento submit
        form.addEventListener('submit', (e) => {
            e.preventDefault(); // Prevenir recarga de página
            formEnviado = true;
        });

        const submitButton = getByRole(document.body, 'button', { name: /log in/i });
        await user.click(submitButton);

        expect(formEnviado).toBe(true);
    });
});